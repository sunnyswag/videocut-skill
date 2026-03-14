<!--
input: Full text
output: Stuttering word index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

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
