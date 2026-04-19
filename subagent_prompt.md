# videocut 批量子 agent 模板

将以下变量替换为实际值，然后作为 Task subagent 的完整 prompt：

---

你正在处理批量任务里的一个视频。

**输入变量**：
```
VIDEO_PATH     = {{VIDEO_PATH}}        # 源视频绝对路径
WORKSPACE_ROOT = {{WORKSPACE_ROOT}}    # 工作区根目录绝对路径
HOTWORDS_FILE  = {{HOTWORDS_FILE}}     # 热词文件绝对路径，或空字符串
SCRIPT_FILE    = {{SCRIPT_FILE}}       # video_script.md 绝对路径，或空字符串
```

**任务步骤**：

1. 运行转录 + 信号分析（CLI 会自动创建 `inputs/ work/ final/` 三目录并把 source 软链到 inputs/）：
   ```bash
   BASE_DIR="$WORKSPACE_ROOT/output/$(date +%Y-%m-%d)_$(basename "$VIDEO_PATH" .mp4)"
   videocut process "$VIDEO_PATH" -o "$BASE_DIR" \
     ${HOTWORDS_FILE:+--hotwords "$HOTWORDS_FILE"}
   # 若提供了讲稿，手动放到 inputs/：
   if [ -n "$SCRIPT_FILE" ]; then cp "$SCRIPT_FILE" "$BASE_DIR/inputs/video_script.md"; fi
   ```

2. **最小阈值检查**：
   - 若 `work/transcript.srt` 的 cue 数 < 5 或视频时长 < 30s，中止并返回 `{"video": "...", "error": "too_short"}`。

3. 读取：
   - `$BASE_DIR/work/transcript.srt`（全部）
   - `$BASE_DIR/work/signals.json`（全部；只有 `duration` + `silences`）
   - `$BASE_DIR/inputs/video_script.md`（若存在）
   - `$BASE_DIR/work/hotwords.txt`（若存在）

4. 按父 SKILL.md 的「启发式」产 `$BASE_DIR/work/edits.json`；把推理记录写到 `$BASE_DIR/work/analysis.md`。

5. 执行剪辑（默认输出到 `$BASE_DIR/final/`）：
   ```bash
   videocut cut "$BASE_DIR/inputs/source.mp4" "$BASE_DIR/work/edits.json"
   ```

6. 返回结构化 JSON（**必须是合法 JSON**，orchestrator 会聚合）：
   ```json
   {
     "video": "<basename>",
     "base_dir": "<BASE_DIR>",
     "original_duration": <sec>,
     "new_duration": <sec>,
     "edits_count": <n>
   }
   ```

**约束**：
- 不得读写其他视频的 `output/` 子目录。
- 不得改动全局配置 / 依赖。
- 转录失败（退出码 ≠ 0）原样透传 stderr 并中止。
- edits.json 中不要产生 `textChanges` / `combines` 字段——本技能只做粗剪，文本错误用 cue 级 `textEdits` 修，拿不准就不改。
