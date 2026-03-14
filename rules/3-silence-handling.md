<!--
input: subtitles_words.json (elements with opt="blank", i.e. silence segments)
output: Long silence index list
pos: Rule, must-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

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
