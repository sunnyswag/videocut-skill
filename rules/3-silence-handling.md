<!--
input: subtitles_words.json (elements with opt="blank", i.e. silence segments)
output: Long silence index list
pos: Rule, must-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

## zh

# 静音段处理

## 阈值规则

| 静音长度 | 处理 |
|---------|------|
| ≤ 0.5秒 | **忽略** - 自然停顿 |
| 0.5-1秒 | **可选删除** - 句间停顿 |
| > 1秒 | **建议删除** - 明显卡顿或展示画面 |

## 输出格式

**整段标记，不拆分**

示例：3.2 秒静音 → 输出 1 条
```
| 64-66 | 12.86-15.80 | 静音3.2s | | 删 |
```

用户在审核网页中取消不想删的。

## 特殊情况

### 长静音
连续 5s+ 的静音整段标记，预选删除：
```
| 323-371 | 71.38-131.38 | 静音60s | | 删 |
```

### 开头静音
视频开头的静音必删：
```
| 0 | 0.00-1.00 | 静音1s | 开头静音 | 删 |
```

---

## en

# Silence Handling

## Threshold Rules

| Silence Length | Action |
|---|---|
| ≤ 0.5s | **Ignore** — natural pause |
| 0.5–1s | **Optional delete** — inter-sentence pause |
| > 1s | **Suggest delete** — obvious stuttering or screen display |

## Output Format

**Mark entire segment, do not split**

Example: 3.2s silence → output 1 entry
```
| 64-66 | 12.86-15.80 | silence 3.2s | | del |
```

Users can deselect unwanted deletions in the review web UI.

## Special Cases

### Long Silence
5s+ continuous silence: mark entire segment, pre-select for deletion:
```
| 323-371 | 71.38-131.38 | silence 60s | | del |
```

### Opening Silence
Silence at the start of the video is always deleted:
```
| 0 | 0.00-1.00 | silence 1s | opening silence | del |
```
