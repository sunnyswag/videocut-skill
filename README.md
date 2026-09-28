# videocut skill

本地 faster-whisper 转录 + AI 粗剪 + ffmpeg 输出。完整说明见 [SKILL.md](./SKILL.md)。

## 五步流程

0. 读取或自动生成 `videocut.config.json` → 源视频 / 讲稿 / 工作区 / 交付目录
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

`videocut.config.json` 是 skill 的内部持久化文件，**不需要手动编辑**。直接用自然语言操作：

- `配置剪辑：视频在 ...，讲稿在 ...，工作区在 ...，成片放 ...`
- `查看剪辑配置`
- `把成片目录改成 D:\videocut`
- `剪辑最近的视频`

首次使用时，skill 会一次问齐缺少的目录并自动生成配置；选中新视频时会自动更新 `current`。可以直接提供其他位置的 `.json` / `.json.md` 配置；未指定时会先查找当前项目目录，再回退到 skill 目录下的 `videocut.config.json`。相对路径一律相对配置文件所在目录解析。

Windows、Linux 和 WSL 路径都可接受，skill 会在调用 CLI 前转换。`current.plan` 既可以是具体讲稿，也可以是项目目录；目录中有 `视频脚本.md` 时优先使用它。

高级用户可参考 [videocut.config.example.json](./videocut.config.example.json)。实际配置含本机路径，不应提交；本仓库的 `.gitignore` 已排除默认文件名。

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
