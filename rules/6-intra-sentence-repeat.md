<!--
input: Sentence list segmented by silence
output: Intra-sentence repeat index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

# Intra-Sentence Repeat Detection

## Definition

Within the same sentence, phrase A appears twice with 1–3 words in between.

## Pattern

```
A + middle words + A
```

## Examples

| Original | Pattern | Delete |
|---|---|---|
| so little so | so + little + so | "so little" |
| then will then | then + will + then | "then will" |
| task 3 task 3 | task 3 + task 3 | first occurrence |

## Not a Slip

| Original | Reason |
|---|---|
| task 1 task 2 task 3 | enumeration |
| to do | English phrase |
| one by one | emphasis |
