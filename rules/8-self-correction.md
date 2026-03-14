<!--
input: subtitles_words.json
output: Self-correction index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

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
