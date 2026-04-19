# videocut skill

本地 faster-whisper 转录 + AI 粗剪 + ffmpeg 输出。完整说明见 [SKILL.md](./SKILL.md)。

## 四步流程

1. `videocut process <video> -o <dir>` → transcript.srt + signals.json
2. `videocut suggest-edits <dir>` → work/edits.candidates.json（机械骨架，可选）
3. AI 读 transcript.srt + signals.json + candidates → 输出 `edits.json`（deletes + textEdits）
4. `videocut cut <video> <dir>/work/edits.json` → `edited.mp4` + `edited.srt`

## 示例

- [edits.example.json](./edits.example.json) — LLM 产出格式
- [signals.example.json](./signals.example.json) — ffmpeg 信号格式
- [subagent_prompt.md](./subagent_prompt.md) — 批量模式子 agent 模板

## 前置依赖（完整版见 SKILL.md）

```bash
npm i -g @huiqinghuang/videocut-cli
pip install faster-whisper
# 需要 ffmpeg、ffprobe、Python 3.10+、Node 18+
```
