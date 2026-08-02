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
```

## 项目配置（videocut.config.json）

**开工第一步**：读 `$SKILL_DIR/videocut.config.json`（`$SKILL_DIR` = 本 SKILL.md 所在目录，解析方式见下）。存在就读它，把源视频、讲稿、输出位置全部从配置解析出来，**不要再反问用户路径**。

**怎么定位 `$SKILL_DIR`**：优先用你读到本文件时拿到的那个路径。拿不到就探测（第一个命中的即是，`.agents` 排在前面以拿到真实目录而非软链）：

```bash
SKILL_DIR=$(ls -d "$PWD"/.agents/skills/videocut "$PWD"/.claude/skills/videocut \
                  "$HOME"/.claude/skills/videocut 2>/dev/null | head -1)
```

注意 `${CLAUDE_SKILL_DIR}` 这个占位符在本文件正文里**不会被展开**（实测 Claude Code 2.1.220 返回字面量），别指望它。

配置放在 skill 目录内、而不是用户项目根，因为**正常安装下只有这个目录属于 videocut**——用户通常只 clone 这个 skill 仓库进自己的 `.agents/skills/`，CLI 走 npm 全局装，宿主项目根是别人的地盘、也未必是个 git 仓库。skill 目录是唯一能可靠定位的锚点。

这个文件**不进版本库**（本 skill 的 `.gitignore` 已排除，里面是本机私有路径；模板见同目录 `videocut.config.example.json`）。所以在新机器上它多半不存在——**由本 skill 负责生成**，见下面「配置不存在时」。

```jsonc
{
  "version": 1,
  "paths": {
    "videoDir":    "/mnt/c/Users/<你>/Videos",       // 录屏落盘目录
    "planDir":     "/mnt/c/Users/<你>/Documents/notes", // 讲稿 / 制作方案根目录
    "workRoot":    "/home/<你>/videocut-work",       // 工作区，必须在 Linux 原生盘
    "deliverRoot": "/mnt/d/videocut"                 // 成片交付根目录
  },
  "deliver": { "layout": "final-only", "files": ["final/edited.mp4", "final/edited.srt"] },
  "current": { "name": "...", "video": "xxx.mp4", "plan": "子目录/方案.md" }
}
```

**字段解析规则**：

| 字段 | 含义 | 解析 |
|---|---|---|
| `current.video` | 源视频 | 相对 `paths.videoDir`；已是绝对路径则直接用 |
| `current.plan` | 讲稿 / 制作方案 | 相对 `paths.planDir`；拷进 `inputs/video_script.md` |
| `current.name` | 项目名 | 用作 `BASE_DIR` 和交付目录的目录名 |
| `paths.workRoot` | 工作区根 | 绝对路径优先（相对则相对 cwd）；`BASE_DIR="$workRoot/$name"` |
| `paths.deliverRoot` | 交付根 | 绝对路径，成片拷到 `$deliverRoot/$name/` |

**`deliver.layout`**：
- `final-only`（默认）：`BASE_DIR` 建在 WSL 本地 `workRoot` 下，只把 `deliver.files` 列的文件拷到 `$deliverRoot/$name/`。**Windows 盘（`/mnt/*`）是 drvfs，转录和 ffmpeg 中间产物在上面跑会明显变慢，所以工作区必须留在 WSL 原生文件系统。**
- `full`：`BASE_DIR` 直接建在 `$deliverRoot/$name/`，整个项目目录都在 Windows 盘上，跳过步骤 5 的拷贝。

**路径写法**：配置里统一用 WSL 形式（`C:\` → `/mnt/c`，`D:\` → `/mnt/d`）。用户如果口头给的是 Windows 路径，自己换算，不要把反斜杠路径塞给 CLI。

**用户在对话里显式给了视频或讲稿时，对话里的值覆盖配置**；配置只提供缺省值。

### 配置不存在时（首次在一台机器上用本 skill）

不要默默套默认值，也不要一条条追问。按这个顺序：

1. **一次性问齐四个路径**（用一个问题问完，别来回聊）：
   - 录屏落盘目录 → `paths.videoDir`
   - 讲稿 / 制作方案目录 → `paths.planDir`
   - 工作区目录 → `paths.workRoot`（**必须在 Linux 原生盘**，别放 `/mnt/*`；可以直接建议 `$HOME/videocut-work`）
   - 成片交付目录 → `paths.deliverRoot`

   在 WSL 里要提醒用户：Windows 路径写成 `/mnt/c/...`、`/mnt/d/...`；用户给了 `C:\...` 就自己换算。

2. **以 `$SKILL_DIR/videocut.config.example.json` 为模板写出 `$SKILL_DIR/videocut.config.json`**，填入上一步的答案，`deliver.layout` 保持 `final-only`。写绝对路径，不要写相对路径。

3. **校验**：`ls -d` 四个目录。`videoDir` / `planDir` 不存在就报给用户、别往下走（多半是路径打错了）；`workRoot` / `deliverRoot` 不存在是正常的，`mkdir -p` 建掉即可。

4. 再填 `current`（见下），然后才进步骤 1。

不需要动任何 `.gitignore`——本 skill 目录自带的 `.gitignore` 已经排除了 `videocut.config.json`。

### `current` 的维护

- 用户说"开始剪辑"这类不带参数的话 → 直接用 `current` 里现有的三个值。
- 用户指名了新视频（`剪 @xxx.mp4`）→ 先按对话里的值跑，跑完**把 `current` 回写进 `$SKILL_DIR/videocut.config.json`**（这次实际用的 video / plan / name），下次就能直接"开始剪辑"。
- `current.video` 空着、用户也没指名 → 列 `paths.videoDir` 下最近修改的几个视频让用户挑，别自己猜。

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

## 流程（5 步）

```
0. 读 $SKILL_DIR/videocut.config.json → VIDEO_PATH / PLAN_PATH / BASE_DIR / DELIVER_DIR
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
<workRoot>/<name>/                # 工作区，在 WSL 原生文件系统上
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

<deliverRoot>/<name>/             # 交付目录，Windows 盘（layout=final-only）
├── edited.mp4
└── edited.srt
```

## 执行步骤（单视频）

**变量**（优先从 `$SKILL_DIR/videocut.config.json` 解析，缺什么才回退到默认）：

```bash
VIDEO_PATH="$videoDir/$current_video"          # 无配置时：用户给的路径
PLAN_PATH="$planDir/$current_plan"             # 无配置时：留空
NAME="$current_name"                           # 无配置时：$(date +%Y-%m-%d)_$(basename "$VIDEO_PATH" .mp4)
BASE_DIR="$workRoot/$NAME"                     # 无配置时：./output/$NAME
DELIVER_DIR="$deliverRoot/$NAME"               # 无配置时：留空，跳过步骤 5
```

### 步骤 1：转录 + 信号分析

```bash
videocut process "$VIDEO_PATH" -o "$BASE_DIR" \
  ${HOTWORDS_FILE:+--hotwords "$HOTWORDS_FILE"}
# 讲稿 / 制作方案（配置里的 current.plan，或用户对话里给的），拷进 inputs/：
cp "$PLAN_PATH" "$BASE_DIR/inputs/video_script.md"
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

### 步骤 5：交付

`deliver.layout == "final-only"` 时，把成片拷到 Windows 盘：

```bash
mkdir -p "$DELIVER_DIR"
cp "$BASE_DIR"/final/edited.mp4 "$BASE_DIR"/final/edited.srt "$DELIVER_DIR"/
```

拷贝而非移动——`BASE_DIR` 留着，方便改 `edits.json` 重跑步骤 4。`layout == "full"` 时 `BASE_DIR` 本身就在 `deliverRoot` 下，跳过本步。

最后向用户报告：`DELIVER_DIR` 的**Windows 路径**（`/mnt/d/...` → `D:\...`）、原时长 → 新时长、删了几处。

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
