---
name: videocut:clip
description: 本地 faster-whisper 转录 + AI 粗剪 + ffmpeg 输出。触发词：剪辑视频、处理视频、粗剪
---

# 口播视频粗剪

> 本地 faster-whisper ASR（零费用） + AI 分析静音/口误/重复 + ffmpeg 剪辑。
> 输出 **edited.mp4** 和 **edited.srt**，用户后续在剪映 / Premiere 等做精修。

## 快速使用

```
User: 剪辑这个视频
User: 处理 @video.mp4
User: 剪辑 @some-folder   （批量）
```

## 前置依赖

| 依赖 | 用途 | 安装 |
|---|---|---|
| Node 18+ | 运行 CLI | 系统包管理器 |
| FFmpeg / ffprobe | 剪辑、信号分析 | 系统包管理器 |
| Python 3.10+ | 运行 faster-whisper | 系统包管理器 |
| @huiqinghuang/videocut-cli | CLI | `npm i -g @huiqinghuang/videocut-cli` |
| faster-whisper | 本地 ASR | 在 venv 里 `pip install faster-whisper`（首次下载模型 ~1.5GB） |

Python 依赖**必须装在 venv 里**（现代 Debian/Ubuntu 的 PEP 668 会拒绝 pip 装到系统 Python）：

```bash
python3 -m venv .venv
.venv/bin/pip install faster-whisper
export VIDEOCUT_PYTHON="$PWD/.venv/bin/python"   # CLI 会读这个环境变量
```

可选 GPU（约 10× 速度，没装会自动回退 CPU+int8）：

```bash
.venv/bin/pip install nvidia-cublas-cu12 nvidia-cudnn-cu12
```

验证：`node -v && ffmpeg -version && videocut --help && "$VIDEOCUT_PYTHON" -c "from faster_whisper import WhisperModel"`

## 流程（3 步）

```
1. videocut process <video> -o <BASE_DIR>
   → inputs/source.mp4 (symlink) + work/transcript.srt + work/signals.json
2. videocut suggest-edits <BASE_DIR>
   → work/edits.candidates.json （机械扫出 gap / mid-cue / filler-only）
3. [LLM 分析] 读 work/transcript.srt + signals.json + candidates
              (+ 可选 inputs/video_script.md, work/hotwords.txt)
   → 写 work/edits.json + work/analysis.md（基于 candidates 再加 stutter 合并 + textEdits）
4. videocut cut inputs/source.mp4 work/edits.json
   → final/edited.mp4 + final/edited.srt
```

## 输出目录结构

```
output/YYYY-MM-DD_<name>/
├── inputs/                       # 用户放（source 由 CLI 软链，script 由用户手动放）
│   ├── source.mp4                # 软链接到源文件，CLI 自动建
│   └── video_script.md           # 可选，用户提供（讲稿，用于 textEdits 判断）
├── work/                         # LLM 读/写，CLI 内部工作区
│   ├── hotwords.txt              # 可选，skill 产出（从 script 提取的热词）
│   ├── transcript.srt            # CLI 产出，LLM 读
│   ├── signals.json              # CLI 产出，LLM 读（只含 duration + silences）
│   ├── transcript.words.json     # CLI 产出，LLM **不读**（cut 内部做词边界吸附）
│   ├── edits.candidates.json   # suggest-edits 产出，LLM 读作骨架
│   ├── edits.json              # LLM 写
│   └── analysis.md               # LLM 写
└── final/                        # 成片
    ├── edited.mp4
    └── edited.srt
```

## 执行步骤（单视频）

**变量**：`VIDEO_PATH` 源视频路径；`BASE_DIR="output/$(date +%Y-%m-%d)_$(basename "$VIDEO_PATH" .mp4)"`

### 步骤 1：转录 + 信号分析

```bash
videocut process "$VIDEO_PATH" -o "$BASE_DIR" \
  ${HOTWORDS_FILE:+--hotwords "$HOTWORDS_FILE"}
# 若用户提供了讲稿，手动放到 inputs/：
cp "$VIDEO_SCRIPT_MD" "$BASE_DIR/inputs/video_script.md"
```

CLI 会自动建出 `inputs/ work/ final/` 三个目录，源视频软链到 `inputs/source.<ext>`，转录和信号产出到 `work/`。首次运行会下载模型 (~1.5GB)。

### 步骤 2：候选扫描（机械）

```bash
videocut suggest-edits "$BASE_DIR"
# 产出 $BASE_DIR/work/edits.candidates.json
# 三类候选：cue 间 gap（>=1.8s）/ mid-cue 停顿（>=1.3s）/ filler-only cue
# 阈值可改：--gap-min / --mid-cue-min
```

候选只是骨架，LLM 不要直接拿来当 edits.json 用；stutter / false-start / asr hallucination 片段 / textEdits **必须靠 LLM 再过一遍**。

### 步骤 3：AI 分析 → edits.json

**读取**：
- `$BASE_DIR/work/transcript.srt`（必读，完整读取）
- `$BASE_DIR/work/signals.json`（必读，只含 `duration` + `silences`）
- `$BASE_DIR/work/edits.candidates.json`（suggest-edits 产出，作为起点）
- `$BASE_DIR/inputs/video_script.md`（若存在，作为语义上下文）
- `$BASE_DIR/work/hotwords.txt`（若存在，用于判断领域术语；skill 可从 script 提取）

**启发式**（优先级从高到低）：

| # | 类型 | 触发 | 动作 |
|---|---|---|---|
| 1 | 长静音（cue 间） | `signals.silences` duration > 2s 不跨句 | `type:"range"` 覆盖静音区间 |
| 2 | cue 内停顿 | `signals.silences` 落在某 cue 时间段内且 > 1s | `type:"range"` 切该停顿（字幕会按保留词重拼） |
| 3 | 独立填充词 cue | 整 cue 只包含填充词 | `type:"cue"` 删该 cue |
| 4 | 句中填充词 | cue 文本里夹着填充词且其他部分是实义内容 | `type:"words"` 精准删该词（见下） |
| 5 | 口吃 | "那个那个" / "就是就是" / "I I I" 两次连续相同 | 删**较早**的 cue |
| 6 | 自我纠正 | 说话者先含糊后重述清楚 | 删**较早**的 cue（片段） |
| 7 | 相邻重复句 | 两条相邻 cue 表达同一语义 | 删**较早**的 cue |
| 8 | 未完成片段 | cue 在词中间断开 + 紧接一条完整重述 | 删片段 cue |

**填充词清单**（判断"只包含填充词"或"夹着填充词"时对照）：
`嗯` / `呃` / `啊` / `哦` / `um` / `uh` / `一个` / `一些` / `就是` / `然后` / `那个` / `比如说` / `其实` / `对吧`。
权威清单在 `videocut-cli/src/core/fillers.ts` 的 `FILLER_WORDS`（suggest-edits 和这里都用同一份）。可按讲者个人习惯微调——若某词对讲者是实义用法（比如讲 "然后 X 就触发了"），就别删。

**ASR 文本修正（textEdits）**：

LLM 还需要在 `edits.json` 的 `textEdits` 字段里产出 **cue 级整行文本替换**，用来纠正 ASR 的识别错误。触发场景：

- 专名识错：`get up` → `GitHub`、`MC P` → `MCP`、`call code` → `Claude Code`
- 同音字错误：`红` → `宏`、`站` → `债`
- 数字 / 术语：`a i` → `AI`、`c 加加` → `C++`

**判断依据**：优先参考 `video_script.md`（讲稿）和 `hotwords.txt`（热词）。若 LLM 不确定（没有上下文支撑），**不要改**——保留原文不会坏事，乱改会导致字幕错得更离谱。

**粒度**：一次只替换一整条 cue 的 text；不做词级替换（那是旧 pathSet 流程的遗产，已废弃）。时间戳不动。

**核心原则**：
- **能删整 cue 就删整 cue**。不要拆到 cue 内部的单词级。
- **textEdits 保守使用**。拿不准就不改；哪怕漏掉几个错字，也比瞎改更好。

**输出**：写入 `$BASE_DIR/work/edits.json`，格式见 `edits.example.json`：

```json
{
  "schema_version": 2,
  "deletes": [
    {"type": "cue", "cueIdx": 1, "reason": "filler_word: 嗯"},
    {"type": "cue", "cueIdx": 12, "cueIdxEnd": 14, "reason": "duplicate_run: cue 15 更清晰"},
    {"type": "range", "start": 152.40, "end": 155.10, "reason": "long_silence 2.7s"}
  ],
  "textEdits": [
    {"cueIdx": 23, "newText": "macro 是一种宏观视角", "reason": "asr_error: 'red' → 'macro'"},
    {"cueIdx": 41, "newText": "把它推到 GitHub 上", "reason": "asr_error: 'get up' → 'GitHub'"}
  ],
  "notes": "其余 ASR 文本未修改（无足够上下文）"
}
```

寻址规则：
- `type:"cue"` + 仅 `cueIdx`：删该 cue（`cueIdx` 是 SRT 中的 1 基序号）
- `type:"cue"` + `cueIdxEnd`：删 `cueIdx..cueIdxEnd` 闭区间
- `type:"range"`：按绝对秒删（可切 cue 间静音，也可切 cue 内部停顿；切 cue 内部时 CLI 会按保留的词重建字幕行）
- `type:"words"`：**句中填充词首选**。`{cueIdx, pattern}` → CLI 在该 cue 的词级时间戳里找匹配，剪掉那段时间。支持 `occurrence` 指定第 N 次出现（默认 1）。
  ```json
  {"type": "words", "cueIdx": 12, "pattern": "呃", "reason": "filler_word mid-cue"}
  {"type": "words", "cueIdx": 34, "pattern": "就是", "occurrence": 2, "reason": "第二次出现"}
  ```
  匹配用 `String.includes(pattern)` 对比每一条 whisper word 的 text——pattern 要和 word 的切分粒度一致才能命中（Whisper 对中文通常是"词 2-3 字一组"的粒度）。命不中会直接 exit 1，自己看 CLI 报错。
- `textEdits[].cueIdx` + `newText`：用 newText 替换整条 cue 的文本（时间戳不变）

同时把推理过程写入 `$BASE_DIR/work/analysis.md`（哪几条 cue 为什么删、textEdits 的上下文证据、ASR 疑似错误但没足够信心修的列表）。

### 步骤 4：剪辑

```bash
videocut cut "$BASE_DIR/inputs/source.mp4" "$BASE_DIR/work/edits.json"
# 默认输出到 $BASE_DIR/final/edited.mp4 和 edited.srt
```

CLI 会：
1. 校验每条 `cueIdx` 是否越界（越界则打印并 exit 1）
2. **应用 textEdits 改 cue.text**（时间戳不变）
3. 按 `transcript.words.json` 做 ±150ms 词边界吸附
4. 复用 50ms buffer + 30ms 音频 crossfade
5. 自动选择硬件编码器（NVENC / VAAPI / QSV / VideoToolbox / libx264）
6. 重映射 SRT 时间轴 → 写 `edited.srt`（已带 textEdits 的修正文本）

## 批量模式（多个视频）

当用户给文件夹 / 多个视频时：

1. glob 所有 `*.mp4`（或 `.mov/.mkv`）
2. 为每个视频启动一个 **Task subagent**（使用 `subagent_prompt.md` 模板，并替换 `VIDEO_PATH` 等变量）
3. 所有 subagent 并行
4. 汇总它们返回的 JSON（`base_dir`、`original_duration`、`new_duration`、`edits_count`）给用户

注意：每个 subagent 处理独立的 `BASE_DIR`，互不干扰。

## 迁移说明

旧版（< 2.0）使用火山引擎 + `subtitles_words.json` + `edits.json` (pathSet) 的工作流已废弃。`output/` 下的旧项目**不兼容**新 CLI，需要对源视频重跑 `videocut process`。
