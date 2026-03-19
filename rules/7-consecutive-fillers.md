<!--
input: subtitles_words.json
output: Consecutive filler word index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

## zh

# 连续语气词

## 模式

两个语气词连在一起：

```
嗯啊、啊呃、哦嗯、呃啊
```

## 检测

```javascript
const fillerWords = ['嗯', '啊', '哎', '诶', '呃', '额', '唉', '哦', '噢', '呀', '欸'];

if (fillerWords.includes(curr) && fillerWords.includes(next)) {
  markAsError(curr, next);
}
```

## 删除策略

全部删除。

---

## en

# Consecutive Filler Words

## Pattern

Two filler words appearing back to back:

```
um-uh, ah-um, oh-um, uh-ah
```

## Detection

```javascript
const fillerWords = ['嗯', '啊', '哎', '诶', '呃', '额', '唉', '哦', '噢', '呀', '欸'];

if (fillerWords.includes(curr) && fillerWords.includes(next)) {
  markAsError(curr, next);
}
```

## Deletion Strategy

Delete all consecutive fillers.
