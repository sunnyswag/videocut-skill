# videocut skill

本地 faster-whisper 转录 + AI 粗剪 + ffmpeg 输出。完整说明见 [SKILL.md](./SKILL.md)。

## 五步流程

0. 读本目录的 `videocut.config.json` → 源视频 / 讲稿 / 工作区 / 交付目录
1. `videocut process <video> -o <dir>` → transcript.srt + signals.json
2. `videocut suggest-edits <dir>` → work/edits.candidates.json（机械骨架，可选）
3. AI 读 transcript.srt + signals.json + candidates → 输出 `edits.json`（deletes + textEdits）
4. `videocut cut <video> <dir>/work/edits.json` → `edited.mp4` + `edited.srt`
5. 成片拷到配置里的交付目录

## 安装

skill 目录放在宿主仓库的 `.agents/skills/videocut`。Claude Code **只扫描 `.claude/skills`**，所以要额外软链一下：

```bash
mkdir -p .claude/skills
ln -sfn ../../.agents/skills/videocut .claude/skills/videocut
```

## 配置

**本目录**放一份 `videocut.config.json`（源视频 / 讲稿 / 工作区 / 交付目录），模板见 [videocut.config.example.json](./videocut.config.example.json)。

放这儿而不是宿主项目根，是因为正常安装下只有本目录属于 videocut——用户 clone 这个仓库进自己的 `.agents/skills/`，CLI 走 npm 全局装，宿主项目根未必是个 git 仓库、也不该被本 skill 占位。skill 在 SKILL.md 里按固定顺序探测出本目录的绝对路径。

**这个文件不进版本库**——本仓库的 `.gitignore` 已排除它。缺失时 skill 会问齐路径后自动生成，不用手动拷。

## 示例

- [videocut.config.example.json](./videocut.config.example.json) — 项目配置模板
- [edits.example.json](./edits.example.json) — LLM 产出格式
- [signals.example.json](./signals.example.json) — ffmpeg 信号格式
- [subagent_prompt.md](./subagent_prompt.md) — 批量模式子 agent 模板

## 前置依赖（完整版见 SKILL.md）

```bash
npm i -g @huiqinghuang/videocut-cli
pip install faster-whisper
# 需要 ffmpeg、ffprobe、Python 3.10+、Node 18+
```
