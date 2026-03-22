# Videocut Skill

> 用 Cursor Skills 构建的视频剪辑 Agent，专为口播视频设计

## 为什么做这个？

剪映的"智能剪口播"有两个痛点：
1. **无法理解语义**：重复说的句子、说错后纠正的内容，它识别不出来
2. **字幕质量差**：专业术语（Claude Code、MCP、API）经常识别错误

这个 Agent 用 LLM 的语义理解能力解决第一个问题，用自定义热词表解决第二个问题。

## 效果演示

**输入**：19 分钟口播原片（各种口误、卡顿、重复）

**输出**：
- 自动识别 608 处问题（静音 114 + 口误/重复 494）
- 剪辑后视频 72MB
- 全程 AI 辅助，人工只需确认

## 核心功能

| 功能 | 说明 | 对比剪映 |
|------|------|----------|
| **语义理解** | AI 逐句分析，识别重说/纠正/卡顿 | 只能模式匹配 |
| **静音检测** | >0.3s 自动标记，可调阈值 | 固定阈值 |
| **重复句检测** | 相邻句语义比对（去掉口头禅前缀） → 删前保后 | 无此功能 |
| **句内重复** | "好我们接下来好我们接下来做" → 删重复部分 | 无此功能 |
| **热词纠错** | 自定义热词表，ASR + LLM 双重纠正 | 无此功能 |
| **规则可定制** | 9 条检测规则独立文件，随时修改偏好 | 无此功能 |

## 快速开始

### 1. 安装 Skill

```bash
# 克隆到 Cursor skill 目录：
git clone https://github.com/sunnyswag/videocut-skill.git ~/.cursor/skills/videocut
```

### 2. 安装依赖

```bash
# macOS
brew install node ffmpeg

# 安装 CLI 工具
npm install -g @huiqinghuang/videocut-cli

# 设置环境变量（建议写入 ~/.zshrc 或 ~/.bashrc）
export VOLCENGINE_API_KEY="your_api_key"

# 验证
node -v && ffmpeg -version && videocut --help && echo $VOLCENGINE_API_KEY
```

### 3. 准备热词表

在项目目录创建 `hotwords.txt`（一行一个），提升 ASR 识别和 LLM 纠错质量：

```txt
container_of
offsetof
GitHub
MCP
API
```

## 使用流程

```
┌─────────────────────────────────────────────────────────────────┐
│  前置条件：安装 Node.js、FFmpeg、@huiqinghuang/videocut-cli     │
│  设置 VOLCENGINE_API_KEY 环境变量                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  在 Cursor 中对 AI 说：                                         │
│  "帮我剪一下这个视频 @video.mp4"                                │
│                                                                 │
│  1. 提取音频 → 火山引擎 ASR 转录 → 字级别时间戳                │
│  2. 生成可读文本 → AI 逐段分析口误/静音/重复/语气词             │
│  3. 生成 edits.json → 应用编辑 → 启动审核网页                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  【人工审核 + 执行剪辑】  http://localhost:8899                 │
│                                                                 │
│  - 点击句子跳转播放                                             │
│  - 勾选/取消删除项                                              │
│  - 确认后点击「执行剪辑」→ 自动 FFmpeg 剪辑                    │
└─────────────────────────────────────────────────────────────────┘
```

支持批量处理：传入文件夹，AI 自动为每个视频启动并行 Subagent 处理。

## 目录结构

```
videocut-skill/
├── README.md              # English version
├── README.zh.md           # 本文件
├── SKILL.md               # 核心 Skill：转录 + AI 审核 + 剪辑流程
├── edits.example.json     # edits.json 格式示例
└── rules/                 # 口误检测规则（可自定义）
    ├── README.md           # 规则索引 + AI 分析优先级
    ├── 1-core-principles.md    # 删前保后
    ├── 2-filler-words.md       # 语气词列表 + 删除边界
    ├── 3-silence-handling.md   # 静音阈值（≤0.5s 忽略，>1s 建议删）
    ├── 4-duplicate-sentences.md # 重复句检测
    ├── 5-stuttering.md         # 卡顿词（那个那个、就是就是）
    ├── 6-intra-sentence-repeat.md # 句内重复（A+中间+A）
    ├── 7-consecutive-fillers.md   # 连续语气词
    ├── 8-self-correction.md       # 重说纠正
    └── 9-incomplete-sentences.md  # 残句检测
```

## 技术架构

```
┌──────────────────┐     ┌──────────────────────┐
│   火山引擎 ASR   │────▶│  字级别时间戳         │
│  （云端转录）    │     │  volcengine_result.json│
└──────────────────┘     └────────┬──────────────┘
                                  │
                                  ▼
┌──────────────────┐     ┌──────────────────┐
│   AI Agent       │────▶│   AI 审核结果    │
│  （语义分析）    │     │   edits.json     │
└──────────────────┘     └────────┬─────────┘
                                  │
                                  ▼
┌──────────────────┐     ┌──────────────────┐
│   审核网页       │────▶│   最终删除列表   │
│  （人工确认）    │     │  delete_segments │
└──────────────────┘     └────────┬─────────┘
                                  │
                                  ▼
┌──────────────────┐     ┌──────────────────┐
│     FFmpeg       │────▶│   剪辑后视频     │
│  filter_complex  │     │   xxx_cut.mp4    │
└──────────────────┘     └──────────────────┘
```

## 依赖

| 依赖 | 用途 | 安装方式 |
|------|------|----------|
| Node.js 18+ | 运行 CLI | `brew install node` |
| FFmpeg | 音视频处理 | `brew install ffmpeg` |
| @huiqinghuang/videocut-cli | 视频剪辑 CLI | `npm install -g @huiqinghuang/videocut-cli` |
| 火山引擎 API | 语音转录 | [申请 Key](https://console.volcengine.com/speech/new/setting/apikeys) |

## 常见问题

### Q: 火山引擎 API Key 在哪获取？

火山引擎控制台 → 语音技术 → 语音识别 → API Key

### Q: 审核网页打不开？

检查端口 8899 是否被占用：`lsof -i :8899`

### Q: 剪辑后音画不同步？

使用 `filter_complex + trim` 而非 `concat demuxer`，CLI 已处理。

### Q: 如何添加自定义热词？

创建 `hotwords.txt`，每行一个词：
```
Claude Code
MCP
GitHub
```

热词在两个阶段生效：
1. 火山引擎 ASR 阶段：作为自定义词汇提升识别准确率
2. LLM 分析阶段：作为关键词归一化词典，纠正 ASR 拆词/谐音错误

## 相关项目

- **CLI 与 Web Review UI**：[sunnyswag/videocut](https://github.com/sunnyswag/videocut) — `@huiqinghuang/videocut-cli` 工具包，负责转录、编辑应用、审阅服务器和 FFmpeg 剪辑。
- **原始参考**：[Ceeon/videocut-skills](https://github.com/Ceeon/videocut-skills) — 本项目所参考的 Claude Code Skills 实现。

## License

MIT
