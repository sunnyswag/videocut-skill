<!--
input: Full text
output: Stuttering word index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

## zh

# 卡顿词

## 模式

同一个词连续说 2-3 次：

```javascript
const stutterPatterns = [
  '那个那个',
  '就是就是',
  '然后然后',
  '这个这个',
  '所以所以'
];
```

## 删除策略

删前面，保留最后一个。

```
原文: "那个那个我想说"
删除: "那个"
保留: "那个我想说"
```

---

## en

# Stuttering

## Pattern

The same word said 2–3 times consecutively:

```javascript
const stutterPatterns = [
  'that that',
  'so so',
  'then then',
  'this this',
  'because because'
];
```

## Deletion Strategy

Delete earlier occurrences, keep the last one.

```
Original: "that that I want to say"
Delete:   "that"
Keep:     "that I want to say"
```
