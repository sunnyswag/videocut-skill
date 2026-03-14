<!--
input: subtitles_words.json
output: Consecutive filler word index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

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
