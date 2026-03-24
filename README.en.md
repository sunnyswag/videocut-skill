# Videocut Skill

> A video clipping Agent built with Cursor Skills, designed for talking-head videos

[中文](README.md)

## Why Build This?

CapCut's "Smart Clip" has two pain points:
1. **No semantic understanding**: It can't detect repeated sentences or self-corrections after mistakes
2. **Poor subtitle quality**: Technical terms (Claude Code, MCP, API) are often transcribed incorrectly

This Agent uses LLM semantic understanding to solve the first problem, and custom hotword lists to solve the second.

## Demo

**Input**: 19-minute raw talking-head footage (various slips, stuttering, repetitions)

**Output**:
- Automatically identified 608 issues (114 silences + 494 slips/repetitions)
- Post-cut video 72MB
- Fully AI-assisted, manual effort limited to confirmation only

**AI Processing**:

![AI Executing Log](https://github.com/sunnyswag/videocut/blob/main/assets/executing_log.jpg?raw=true)

**Review Web UI**:

![Edit Review Demo](https://github.com/sunnyswag/videocut/blob/main/assets/edit_demo.png?raw=true)

**Export Process Demo**:

![Export Demo](https://github.com/sunnyswag/videocut/blob/main/assets/export_demo.png?raw=true)

## Core Features

| Feature | Description | vs CapCut |
|---|---|---|
| **Semantic understanding** | AI analyzes sentence-by-sentence, detects re-takes / corrections / stuttering | Pattern matching only |
| **Silence detection** | Auto-mark >0.3s, adjustable threshold | Fixed threshold |
| **Duplicate detection** | Semantic comparison of adjacent sentences (strip filler prefixes) → delete earlier, keep later | Not available |
| **Intra-sentence repeat** | "ok let's next ok let's next do" → delete repeated part | Not available |
| **Hotword correction** | Custom hotword list for dual-stage ASR + LLM correction | Not available |
| **Customizable rules** | 9 independent rule files, adjust preferences anytime | Not available |

## Quick Start

### 1. Install Skill

```bash
# Clone to Cursor skills directory:
git clone https://github.com/sunnyswag/videocut-skill.git ~/.cursor/skills/videocut
```

### 2. Install Dependencies

```bash
# macOS
brew install node ffmpeg

# Install CLI
npm install -g @huiqinghuang/videocut-cli

# Set environment variable (recommended: add to ~/.zshrc or ~/.bashrc)
export VOLCENGINE_API_KEY="your_api_key"

# Verify
node -v && ffmpeg -version && videocut --help && echo $VOLCENGINE_API_KEY
```

### 3. Prepare Hotword List

Create `hotwords.txt` in your project directory (one term per line) to improve ASR recognition and LLM correction:

```txt
container_of
offsetof
GitHub
MCP
API
```

## Usage Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Prerequisites: Install Node.js, FFmpeg, @huiqinghuang/videocut-cli │
│  Set VOLCENGINE_API_KEY environment variable                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Tell the AI in Cursor:                                         │
│  "Clip this talking-head video @video.mp4"                      │
│                                                                 │
│  1. Extract audio → Volcengine ASR → word-level timestamps      │
│  2. Generate readable text → AI analyzes slips/silence/repeats  │
│  3. Generate edits.json → apply edits → launch review web UI    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  [Manual Review + Execute Cut]  http://localhost:8899           │
│                                                                 │
│  - Click sentences to jump & play                               │
│  - Check/uncheck deletion items                                 │
│  - Confirm, then click "Execute Cut" → auto FFmpeg cut          │
└─────────────────────────────────────────────────────────────────┘
```

Batch processing is supported: pass a folder, and the AI automatically launches parallel subagents for each video.

## Directory Structure

```
videocut-skill/
├── README.md              # This file
├── README.zh.md           # Chinese version
├── SKILL.md               # Core skill: transcribe + AI review + cut workflow
├── edits.example.json     # Example edits format
└── rules/                 # Slip detection rules (customizable)
    ├── README.md              # Rule index + AI analysis priority
    ├── 1-core-principles.md   # Delete earlier, keep later
    ├── 2-filler-words.md      # Filler word list + deletion boundaries
    ├── 3-silence-handling.md  # Silence thresholds (≤0.5s ignore, >1s suggest delete)
    ├── 4-duplicate-sentences.md
    ├── 5-stuttering.md
    ├── 6-intra-sentence-repeat.md
    ├── 7-consecutive-fillers.md
    ├── 8-self-correction.md
    └── 9-incomplete-sentences.md
```

## Architecture

```
┌──────────────────┐     ┌──────────────────────┐
│  Volcengine ASR  │────▶│  Word-level           │
│  (cloud transcr) │     │  timestamps           │
└──────────────────┘     └────────┬──────────────┘
                                  │
                                  ▼
┌──────────────────┐     ┌──────────────────┐
│   AI Agent       │────▶│   AI review      │
│  (semantic)      │     │   edits.json     │
└──────────────────┘     └────────┬─────────┘
                                  │
                                  ▼
┌──────────────────┐     ┌──────────────────┐
│   Review Web UI  │────▶│  Final deletions │
│  (manual confirm)│     │  delete_segments │
└──────────────────┘     └────────┬─────────┘
                                  │
                                  ▼
┌──────────────────┐     ┌──────────────────┐
│     FFmpeg       │────▶│  Clipped video   │
│  filter_complex  │     │  xxx_cut.mp4     │
└──────────────────┘     └──────────────────┘
```

## Dependencies

| Dependency | Purpose | Install |
|---|---|---|
| Node.js 18+ | Run CLI | `brew install node` |
| FFmpeg | Audio/video processing | `brew install ffmpeg` |
| @huiqinghuang/videocut-cli | Video clipping CLI | `npm install -g @huiqinghuang/videocut-cli` |
| Volcengine API | Speech transcription | [Get Key](https://console.volcengine.com/speech/new/setting/apikeys) |

## Related Projects

- **CLI & Web Review UI**: [sunnyswag/videocut](https://github.com/sunnyswag/videocut) — the `@huiqinghuang/videocut-cli` package that powers transcription, edit application, review server, and FFmpeg cutting.
- **Original reference**: [Ceeon/videocut-skills](https://github.com/Ceeon/videocut-skills) — the Claude Code Skills implementation this project builds upon.

## License

MIT
