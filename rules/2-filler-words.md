<!--
input: subtitles_words.json
output: Filler word index list
pos: Rule, manual-confirmation priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

## zh

# 语气词检测

## 语气词列表

```javascript
const fillerWords = ['嗯', '啊', '哎', '诶', '呃', '额', '唉', '哦', '噢', '呀', '欸'];
```

## 删除边界

```
错误：删语气词时间戳 (语气词.start - 语气词.end)
      → 可能删掉前面字的尾音

正确：从前一个字的 end 到后一个字的 start
      → (前字.end - 后字.start)
```

---

## en

# Filler Word Detection

## Filler Word List

```javascript
const fillerWords = ['um', 'uh', 'er', 'ah', 'like', 'you know', 'hmm', 'so', 'well', 'actually'];
```

## Deletion Boundaries

```
Wrong: Delete the filler word's own timestamp (filler.start – filler.end)
       → May clip the tail sound of the preceding word

Correct: From previous word's end to next word's start
         → (prevWord.end – nextWord.start)
```
