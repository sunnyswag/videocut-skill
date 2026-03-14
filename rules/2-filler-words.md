<!--
input: subtitles_words.json
output: Filler word index list
pos: Rule, manual-confirmation priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

# Filler Word Detection

## Filler Word List

```javascript
const fillerWords = ['嗯', '啊', '哎', '诶', '呃', '额', '唉', '哦', '噢', '呀', '欸'];
```

## Deletion Boundaries

```
Wrong: Delete the filler word's own timestamp (filler.start – filler.end)
       → May clip the tail sound of the preceding word

Correct: From previous word's end to next word's start
         → (prevWord.end – nextWord.start)
```
