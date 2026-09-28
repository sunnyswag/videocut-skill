---
name: videocut:clip
description: 本地 faster-whisper 转录 + AI 粗剪 + ffmpeg 输出。触发词：剪辑视频、处理视频、粗剪
---

# 口播视频粗剪

> 本地 faster-whisper ASR（零费用） + AI 分析静音/口误/重复 + ffmpeg 剪辑。
> 输出 **edited.mp4** 和 **edited.srt**，用户后续在剪映 / Premiere 等做精修。

## 快速使用

```
User: 开始剪辑            （不带参数 → 走 videocut.config.json 的 current）
User: 剪辑这个视频
User: 处理 @video.mp4
User: 剪辑 @some-folder   （批量）
User: 配置剪辑：视频在 …，讲稿在 …，成片放 …
User: 查看剪辑配置
```

## 配置（由 skill 自动维护）

`videocut.config.json` 是内部持久化文件，不是要求用户手动编辑的界面。用户可以直接说“配置剪辑”、“查看剪辑配置”、“把成片目录改成 …”或“剪辑最近的视频”。**不要让用户自己复制模板或修改 JSON。**

### 定位配置

1. 用户在对话里给了配置文件路径时，它就是 `CONFIG_PATH`；接受 `.json` 和内容为纯 JSON 的 `.json.md`。
2. 否则查找当前项目目录下的 `videocut.config.json` 或 `videocut.config.json.md`。
3. 仍未找到时，使用 `$SKILL_DIR/videocut.config.json`。
4. `CONFIG_DIR` 是 `CONFIG_PATH` 的父目录，配置里的所有相对路径都相对它解析，**不相对当前 shell 目录**。

`$SKILL_DIR` 优先用读取本 SKILL.md 时已知的路径。拿不到时再探测（`.agents` 排在前面以拿到真实目录而非软链）：

```bash
SKILL_DIR=$(ls -d "$PWD"/.agents/skills/videocut "$PWD"/.claude/skills/videocut \
                  "$HOME"/.claude/skills/videocut 2>/dev/null | head -1)
```

`${CLAUDE_SKILL_DIR}` 在 SKILL.md 正文里可能只是字面量，不要依赖它。默认配置被本 skill 的 `.gitignore` 排除，因为其中包含本机私有路径。

### 自然语言配置流程

- **首次使用**：先从用户已给的视频、讲稿和当前工作区推断。仍缺信息时，用一个问题一次问齐 `videoDir`、`planDir`、`workRoot`、`deliverRoot`，然后自动校验并写入 `CONFIG_PATH`。
- **局部修改**：用户只改一项时，保留其余字段，验证新路径后回写，再用一句话汇报改动。
- **查看配置**：用可读列表摘要四个目录和当前项目；除非用户要求，不要倾倒原始 JSON。
- **新视频**：对话里的 video / plan / name 覆盖配置。路径验证成功后，在开始转录前自动回写 `current`，下次就可以只说“开始剪辑”。
- **未指定视频**：`current.video` 也为空时，列出 `videoDir` 下最近修改的几个视频让用户挑，不自行猜测。
- **旧配置损坏**：先保留一份 `.bak`，再在不改变已能识别字段语义的前提下修复；无法可靠修复时才问用户。

### 字段与路径规则

| 字段 | 解析 |
|---|---|
| `paths.videoDir` | 视频根目录；相对路径相对 `CONFIG_DIR` |
| `paths.planDir` | 讲稿根目录；相对路径相对 `CONFIG_DIR` |
| `paths.workRoot` | 中间产物根目录；`BASE_DIR = workRoot / current.name` |
| `paths.deliverRoot` | 成片根目录；`DELIVER_DIR = deliverRoot / current.name` |
| `current.video` | 绝对路径直接用，否则相对 `videoDir` |
| `current.plan` | 可以是文件或目录；绝对路径直接用，否则相对 `planDir` |
| `current.name` | 作为工作区和交付目录的子目录名 |

`current.plan` 指向目录时，按以下顺序选讲稿：

1. 精确命中 `视频脚本.md`；
2. 只有一个文件名包含“脚本”的 Markdown 文件；
3. 目录中只有一个 Markdown 文件；
4. 仍有多个候选时一次列出让用户选，不要猜。

配置可保留用户熟悉的 Windows、Linux 或 WSL 路径。先解析为绝对路径，再按 CLI 实际运行环境转换：

- CLI 在 WSL 里运行时，用 `wslpath -u` 把 Windows 路径转为 `/mnt/...`。
- CLI 在 Windows 里运行时，保留 Windows 路径；遇到 WSL 原生路径时应改在 WSL 里执行，不猜测映射。
- JSON 中如果使用反斜杠，必须写成 `\\`；由 skill 写入时自动正确转义。也可写 Windows 能识别的正斜杠路径，如 `D:/video_work`。

`deliver.layout` 的语义：

- `final-only`（默认）：中间产物留在 `workRoot`，只把 `deliver.files` 拷到 `deliverRoot/current.name/`。WSL 下建议把 `workRoot` 放在 Linux 原生文件系统以获得更好性能，但不要擅自改写用户指定的 Windows 盘路径。
- `full`：`BASE_DIR` 直接使用 `deliverRoot/current.name/`，跳过步骤 5 的拷贝。

路径校验在转换到实际运行环境后进行。`videoDir` / `planDir` 或选中的源文件不存在时停下并报出具体路径；`workRoot` / `deliverRoot` 不存在时可以自动创建。

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

可选 GPU（没装会自动回退 CPU+int8，只是慢，不会报错）：

```bash
.venv/bin/pip install nvidia-cublas-cu12 nvidia-cudnn-cu12
```

装完即可，**不用配 `LD_LIBRARY_PATH`**——这两个包把 `.so` 装在 `site-packages/nvidia/*/lib` 下，不在动态链接器的搜索路径里，`whisper_transcribe.py` 会在加载模型前用绝对路径把它们预加载一遍（`preload_nvidia_libs()`）。

`compute_type` 交给 `auto`，脚本按 `ctranslate2.get_supported_compute_types("cuda")` 的实际支持情况挑，**不要硬写 `float16`**：

| 卡 | 选中的类型 | 相对 CPU int8 的实测加速 |
|---|---|---|
| Ampere / Ada 及以后（sm_80+） | `float16` | 大幅提升 |
| Turing / Volta（sm_70~75） | `float16` | 大幅提升 |
| **Pascal（sm_6x，如 GTX 10 系）** | `int8_float32` | **约 2×**（实测 GTX 1060：60s 音频 30.4s → 14.5s，含约 5s 模型加载） |

Pascal 的 fp16 吞吐只有 fp32 的一个零头，ctranslate2 会直接把 `float16` 从支持列表里剔掉，硬指定会加载失败。老卡上 GPU 仍然值得开，但别指望一个数量级。

确认真的走了 GPU，看这行日志：`[whisper] load model=... device=cuda compute_type=...`；回退时会明确打印 `CUDA 运行时缺失，回退 CPU+int8`。

验证：`node -v && ffmpeg -version && videocut --help && "$VIDEOCUT_PYTHON" -c "from faster_whisper import WhisperModel"`

## 流程（5 步）

```
0. 定位或自动生成 CONFIG_PATH → 解析 VIDEO_PATH / PLAN_PATH / BASE_DIR / DELIVER_DIR
1. videocut process <video> -o <BASE_DIR>
   → inputs/source.mp4 (symlink) + work/transcript.srt + work/signals.json
2. videocut suggest-edits <BASE_DIR>
   → work/edits.candidates.json （机械扫出 gap / mid-cue / filler-only）
3. [LLM 分析] 读 work/transcript.srt + signals.json + candidates
              (+ 可选 inputs/video_script.md, work/hotwords.txt)
   → 写 work/edits.json + work/analysis.md（基于 candidates 再加 stutter 合并 + textEdits）
4. videocut cut inputs/source.mp4 work/edits.json
   → final/edited.mp4 + final/edited.srt
5. 拷 final/* → DELIVER_DIR （layout=final-only 时）
```

## 输出目录结构

```
<workRoot>/<name>/                # 中间工作区
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

<deliverRoot>/<name>/             # 交付目录（layout=final-only）
├── edited.mp4
└── edited.srt
```

## 执行步骤（单视频）

**变量**（先解析绝对路径，再转换为 CLI 实际运行环境的路径形式）：

```text
CONFIG_DIR  = dirname(CONFIG_PATH)
VIDEO_DIR   = resolve(CONFIG_DIR, paths.videoDir)
PLAN_DIR    = resolve(CONFIG_DIR, paths.planDir)
VIDEO_PATH  = resolve(VIDEO_DIR, current.video)
PLAN_PATH   = resolve_plan(PLAN_DIR, current.plan)  # 可返回空、具体文件，或触发候选选择
NAME        = current.name
BASE_DIR    = resolve(CONFIG_DIR, paths.workRoot) / NAME
DELIVER_DIR = resolve(CONFIG_DIR, paths.deliverRoot) / NAME
```

### 步骤 1：转录 + 信号分析

```bash
videocut process "$VIDEO_PATH" -o "$BASE_DIR" \
  ${HOTWORDS_FILE:+--hotwords "$HOTWORDS_FILE"}
# 有讲稿时才拷进 inputs/：
if [ -n "$PLAN_PATH" ]; then
  cp "$PLAN_PATH" "$BASE_DIR/inputs/video_script.md"
fi
```

CLI 会自动建出 `inputs/ work/ final/` 三个目录，源视频软链到 `inputs/source.<ext>`，转录和信号产出到 `work/`。首次运行会下载模型 (~1.5GB)。

#### 必做：核一遍静音阈值

`analyze-signals` 的默认阈值是 `-30dB`，**对偏轻的录音会失效**——阈值一旦高于人声平均电平，ffmpeg 会把大段说话判成静音，照着切会把内容剪没。这个错误不会报错，只会安静地毁片。

每条新素材先量电平，再拿词级时间戳验证：

```bash
# 1) 人声有多响
ffmpeg -hide_banner -nostats -i "$VIDEO_PATH" -af volumedetect -f null - 2>&1 | grep mean_volume

# 2) 「静音」区间里压着多少语音（比例越低越好）
python3 - "$BASE_DIR" <<'EOF'
import json, sys
w = f"{sys.argv[1]}/work"
sig = json.load(open(f"{w}/signals.json"))
words = sorted((x["start"], x["end"]) for u in json.load(open(f"{w}/transcript.words.json"))["utterances"] for x in u["words"])
def covered(s, e):
    return sum(min(e, we) - max(s, ws) for ws, we in words if we > s and ws < e)
tot = sum(x["end"] - x["start"] for x in sig["silences"])
cov = sum(covered(x["start"], x["end"]) for x in sig["silences"])
print(f"静音 {tot:.1f}s，其中人声 {cov:.1f}s（{cov/max(tot,1e-9)*100:.1f}%）")
EOF
```

**人声占比 >35% 就说明阈值不对**，按 `mean_volume` 往下调 7~10dB 重算，直到降到 25% 上下（剩下的是 whisper 词级时间戳自带的 padding，正常）：

```bash
videocut analyze-signals "$BASE_DIR/inputs/source.mp4" -o "$BASE_DIR/work/signals.json" --silence-noise-db -50
videocut suggest-edits "$BASE_DIR"     # 信号变了，候选必须重扫
```

实测参考：一条 `mean_volume=-38.7dB`、语音段 `-43.2dB` 的录屏，默认 -30dB 下 **50.5% 的「静音」其实是人声**，mid-cue 候选 10 条里 9 条是幻觉；换 -50dB 后降到 21.9%。

### 步骤 2：候选扫描（机械）

```bash
videocut suggest-edits "$BASE_DIR"
# 产出 $BASE_DIR/work/edits.candidates.json
# 三类候选：cue 间 gap（>=1.8s）/ mid-cue 停顿（>=1.3s）/ filler-only cue
# 阈值可改：--gap-min / --mid-cue-min
```

候选只是骨架，LLM 不要直接拿来当 edits.json 用；stutter / false-start / asr hallucination 片段 / textEdits **必须靠 LLM 再过一遍**。

**最危险的一类是自我纠正**——机械扫描只认得出那个纠正词（`不` / `啊不对` / `我说错了`）是填充词，认不出它前面那句讲错了。只删纠正词，等于把错话留在成片里：

```
348  你可能先sleep了一段时间
349  你这个时候就是非阻塞了     ← 讲错了，机械候选没标
350  不                        ← 机械候选只标了这条
351  你就是阻塞了               ← 正确的说法
```

只按候选删 350 → 成片变成「非阻塞了 / 你就是阻塞了」，自相矛盾且知识点是错的。正确做法是连 **349 一起删**。凡是候选里出现单字 `不` / `不是` / `不对`，都要回头看**前一条是不是说错了**。

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

### 步骤 5：交付

`deliver.layout == "final-only"` 时，把成片拷到交付目录：

```bash
mkdir -p "$DELIVER_DIR"
cp "$BASE_DIR"/final/edited.mp4 "$BASE_DIR"/final/edited.srt "$DELIVER_DIR"/
```

拷贝而非移动——`BASE_DIR` 留着，方便改 `edits.json` 重跑步骤 4。`layout == "full"` 时 `BASE_DIR` 本身就在 `deliverRoot` 下，跳过本步。

最后向用户报告：用户所在系统能直接打开的 `DELIVER_DIR` 路径、原时长 → 新时长、删了几处。

## 批量模式（多个视频）

当用户给文件夹 / 多个视频时：

1. glob 所有 `*.mp4`（或 `.mov/.mkv`）——没给目录时用配置里的 `paths.videoDir`
2. **orchestrator 自己解析配置**，为每个视频算出 `NAME=$(date +%Y-%m-%d)_$(basename "$VIDEO_PATH" .mp4)`（批量时 `current` 不适用）、`BASE_DIR`、`DELIVER_DIR`
3. 为每个视频启动一个 **Task subagent**（使用 `subagent_prompt.md` 模板，把上面算好的绝对路径填进去；子 agent 不再读配置）
4. 所有 subagent 并行
5. 汇总它们返回的 JSON（`base_dir`、`deliver_dir`、`original_duration`、`new_duration`、`edits_count`）给用户

注意：每个 subagent 处理独立的 `BASE_DIR`，互不干扰。

## 迁移说明

旧版（< 2.0）使用火山引擎 + `subtitles_words.json` + `edits.json` (pathSet) 的工作流已废弃。`output/` 下的旧项目**不兼容**新 CLI，需要对源视频重跑 `videocut process`。
