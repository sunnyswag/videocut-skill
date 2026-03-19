<!--
input: subtitles_words.json
output: Self-correction index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

## zh

# 重说纠正

## 模式

说错后立即纠正，删除前面错误的部分。

### 1. 部分重复

前后词语有重叠但不完全相同：

| 原文 | 删除 |
|------|------|
| 你再关你关掉 | "你再关" |
| 怎么让它去有个更大的 | "怎么让它去" |

### 2. 否定纠正

用否定词纠正刚说的：

| 原文 | 删除 |
|------|------|
| 它是它不是 | "它是" |
| 可以不可以 | "可以" |

### 3. 词被打断

词说一半 + 静音 + 重说完整：

| 原文 | 删除 |
|------|------|
| 依赖[静]依赖关系 | "依赖[静]" |

## 检测逻辑

```javascript
// 找相邻词的公共前缀
if (word[i].text.startsWith(prefix) && word[i+n].text.startsWith(prefix)) {
  // 且后者更完整 → 删前者
}
```

---

## en

# Self-Correction

## Pattern

Saying something wrong then immediately correcting it — delete the earlier incorrect part.

### 1. Partial Repeat

Overlapping but not identical words between before and after:

| Original | Delete |
|---|---|
| "you then clo- you close it" | "you then clo-" |
| "how to make it have a bigger" | "how to make it" |

### 2. Negation Correction

Using a negation to correct what was just said:

| Original | Delete |
|---|---|
| "it is it isn't" | "it is" |
| "can can't" | "can" |

### 3. Word Interrupted

Word said halfway + silence + re-said completely:

| Original | Delete |
|---|---|
| "depen- [silence] dependency" | "depen- [silence]" |

## Detection Logic

```javascript
// Find common prefix between adjacent words
if (word[i].text.startsWith(prefix) && word[i+n].text.startsWith(prefix)) {
  // and the latter is more complete → delete the former
}
```
