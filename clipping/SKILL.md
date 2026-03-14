---
name: videocut:剪口播
description: 口播视频转录和口误识别。生成审查稿和删除任务清单。触发词：剪口播、处理视频、识别口误
---

<!--
input: 视频文件 (*.mp4) 或 文件夹（内含多个视频）
output: subtitles_words.json、auto_selected.json
pos: 转录+识别，到用户网页审核为止
-->

# 剪口播 v3

> 火山引擎转录 + AI 口误识别 + 网页审核

## 快速使用

```
用户: 帮我剪这个口播视频
用户: 处理一下这个视频
用户: 处理 @某文件夹文件夹里的视频
用户: 剪口播 @某文件夹
```

## 前置要求

```bash
# 安装 CLI
npm install -g @videocut/cli

# 配置火山引擎环境变量
export VOLCENGINE_API_KEY="your_api_key"
```

## 输出目录结构

```
output/
└── YYYY-MM-DD_video/
  ├── 1_transcribe/
  │   ├── audio.mp3
  │   └── volcengine_result.json
  ├── common/
  │   ├── subtitles_words.json       # 唯一数据源（opt + gap）
  │   └── subtitles_words_edited.json  # 应用 edits 后
  ├── 2_analysis/
  │   ├── readable.txt   # 由 common 生成，供人/AI 阅读
  │   ├── edits.json    # 删除/改字清单，由 apply-edits 写回
  │   └── analysis.md
  └── 3_review/
      └── delete_segments.json  # 执行剪辑时保存
```

**规则**：已有文件夹则复用，否则新建。

## 流程

```
0. 创建输出目录
    ↓
1. 转录视频 (videocut transcribe)
    ↓
2. 生成 opted 结构 (videocut generate-subtitles)
    ↓
3. 生成 readable，AI 分析口误，维护 edits.json
    ↓
4. 应用编辑 (videocut apply-edits)
    ↓
5. 启动审核服务器 (videocut review-server)
    ↓
【等待用户确认】→ 网页点击「执行剪辑」
```

### 多视频批量处理

当用户指定**文件夹**或**多个视频**时，可使用 `mcp_task` 启动多个 subagent 并行处理：

| 方式 | 说明 |
|------|------|
| **subagent 类型** | `generalPurpose`（可执行命令 + AI 口误分析） |
| **并行数量** | 每个视频 1 个 subagent，同时启动 |
| **审核服务** | 所有 subagent 完成后，**只启动 1 个** `videocut review-server`（传入 `output/` 父目录），网页以 Tab 形式展示各视频 |

**subagent 提示词要点**（需在 prompt 中写明）：
- `VIDEO_PATH`、`WORKSPACE_ROOT` 的绝对路径
- 步骤 0 创建输出目录
- 若有 `video_script.md` 或用户脚本，说明视频上下文来源
- subagent 只执行步骤 0-4（转录+分析+apply-edits），**不启动审核服务器**

## 执行步骤

**变量约定**：`VIDEO_PATH`=视频路径；`BASE_DIR`=输出目录。

### 步骤 0: 创建输出目录

```bash
# 创建输出目录
BASE_DIR="output/$(date +%Y-%m-%d)_$(basename "$VIDEO_PATH" .mp4)"
mkdir -p "$BASE_DIR"/{1_transcribe,common,2_analysis,3_review}

# 将视频链接到输出目录的父目录（供审核服务器定位视频）
ln -sf "$(cd "$(dirname "$VIDEO_PATH")" && pwd)/$(basename "$VIDEO_PATH")" "$(dirname "$BASE_DIR")/"
```

### 步骤 1: 转录

```bash
videocut transcribe "$VIDEO_PATH" -o "$BASE_DIR"
# 输出: 1_transcribe/audio.mp3, volcengine_result.json
```

### 步骤 2: 拆分字幕（opt + gap 插入）

```bash
videocut generate-subtitles "$BASE_DIR/1_transcribe/volcengine_result.json"
# 输出: common/subtitles_words.json（唯一数据源）
```

### 步骤 3: 分析口误（脚本+AI）

#### 3.1 生成易读格式

```bash
videocut generate-readable "$BASE_DIR/common/subtitles_words.json" -o "$BASE_DIR/2_analysis/readable.txt"
```

#### 3.2 读取用户习惯

读取 `clipping/rules/` 目录下所有规则文件。
读取 `BASE_DIR` 下用户提供的脚本，理解视频上下文。

#### 3.3 AI 分析：剔除静音/口误 + 修正字幕文案（输出 edits.json）

AI 读取 readable.txt，结合视频上下文（用户脚本/口述内容），完成两件事：
1. **剔除**：把静音段（blank）和口误片段标记为删除。
2. **修正**：根据视频实际内容纠正 ASR 转录错字（如专有名词、同音错字）。

产出写入 `2_analysis/edits.json`，格式参考 `$SKILL_DIR/clipping/edits.example.json`。
pathSet 有三种形态：`{ parent: i }`（整句）、`{ parent: i, children: [j] }`（单个子节点）、`{ parent: i, children: [j, k] }`（多个子节点），所有下标 0-based。deletes 可以是整句或子节点级别，textChanges 和 combines 只能是子节点级别。

**剔除规则（deletes，按优先级）**：

| # | 类型 | 判断方法 | 删除范围 |
|---|------|----------|----------|
| 1 | 静音段 | `blank_Xs` 行 | 整行 |
| 2 | 重复句 | 相邻句子开头 ≥5 字相同 | 较短的**整句** |
| 3 | 隔一句重复 | 中间是残句时，比对前后句 | 前句 + 残句 |
| 4 | 残句 | 话说一半 + 静音 | **整个残句** |
| 5 | 句内重复 | A + 中间 + A 模式 | 前面部分 |
| 6 | 卡顿词 | 那个那个、就是就是 | 前面部分 |
| 7 | 重说纠正 | 部分重复 / 否定纠正 | 前面部分 |
| 8 | 语气词 | 嗯、啊、那个 | 标记为删除 |

**修正规则（textChanges）**：

| 场景 | 示例 | 操作 |
|------|------|------|
| ASR 同音错字 | 「红」→「宏」 | `{ "pathSet": { "parent": 2, "children": [16] }, "newText": "宏", "oldText": "红" }` |
| 专有名词 | 「get up」→「GitHub」 | combines 合并对应子节点 |
| 多余空格/标点 | 「a a i」→「AI」 | combines 合并或 textChanges 修正 |

**核心原则**：
- **整句删除**：残句、重复句删整句（`{ parent: i }`），不只删几个字
- **修正基于上下文**：结合用户提供的视频脚本或口述内容判断正确用词

**分段分析（循环执行）**：

```
1. Read readable.txt offset=N limit=100（每段约 100 行，含句行+字行）
2. 分析这 100 行：标记要删除的 path、要修正的 text
3. 将 deletes 和 textChanges 追加到 edits.json
4. 记录分析过程到 analysis.md
5. N += 100，回到步骤 1
```

#### 3.6 维护 edits.json 并回写 JSON

以 **common/subtitles_words.json** 为唯一数据源。AI 或人工在 readable 上标注的「删/改」写入 `2_analysis/edits.json`，再通过脚本写回：

```bash
videocut apply-edits "$BASE_DIR/common/subtitles_words.json" "$BASE_DIR/2_analysis/edits.json"
# 输出: common/subtitles_words_edited.json
```

### 步骤 5: 启动审核服务器

```bash
# root_path 由 AI 决定：
#   单视频 → 传项目目录（如 "$BASE_DIR"），网页仅显示该项目
#   多视频 → 传 output/ 父目录，网页以 Tab 展示所有项目
videocut review-server 8899 --path "$ROOT_PATH"
# 打开 http://localhost:8899
```

用户在网页中：
- 切换 Tab 选择要审核的视频
- 播放视频确认
- 勾选/取消删除项
- 点击「执行剪辑」

---

## 数据格式

### edits.json（2_analysis）

```json
{
  "deletes": [
    { "pathSet": { "parent": 0 }, "reason": "silence" },
    { "pathSet": { "parent": 1, "children": [2, 3] }, "reason": "repetition" }
  ],
  "textChanges": [
    { "pathSet": { "parent": 2, "children": [1] }, "newText": "C", "oldText": "c" }
  ],
  "combines": [
    { "pathSet": { "parent": 16, "children": [5, 6] }, "newText": "GitHub", "oldText": "get up", "reason": "asr_error" }
  ]
}
```

- **pathSet**：所有下标 0-based。`{ parent: i }` = utterances[i]（整句）；`{ parent: i, children: [j, k] }` = 单个/多个子节点。
- **deletes**：标记删除，apply 后对应节点 `opt` 设为 `"del"`。
- **textChanges**：纠错时改写某节点的 `text`。
- **combines**：合并同一父节点下多个子节点为一个，取时间并集，用 `newText` 替换。

---

## 规则文件

`clipping/rules/` 目录下包含口误识别规则：

| 文件 | 说明 |
|------|------|
| 1-core-principles.md | 核心原则 |
| 2-filler-words.md | 语气词规则 |
| 3-silence-handling.md | 静音处理 |
| 4-duplicate-sentences.md | 重复句识别 |
| 5-stuttering.md | 卡顿词识别 |
| 6-intra-sentence-repeat.md | 句内重复 |
| 7-consecutive-fillers.md | 连读语气词 |
| 8-self-correction.md | 自我纠正 |
| 9-incomplete-sentences.md | 残句识别 |
