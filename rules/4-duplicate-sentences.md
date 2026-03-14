<!--
input: Sentence list segmented by silence
output: Duplicate sentence index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

# Duplicate Sentence Detection

## Definition

Adjacent sentences (separated by silence) share ≥5 identical starting characters, usually indicating a re-take after a mistake.

## Core Principle

**Segment first, then compare**: Must first split by silence into a sentence list, then compare adjacent sentences.

## Correct Analysis Method

```
✓ Correct: Split by silence → compare adjacent sentence beginnings → delete whole sentence
✗ Wrong: Scan character by character → find repeated fragments → delete fragment only
```

### Steps

1. **Split by silence** (silence ≥0.5s as separator)
2. **Compare adjacent sentences** (≥5 identical starting chars → delete the shorter whole sentence)
3. **Compare skip-one sentences** (when middle is a fragment, also check whether before/after sentences are duplicates)

## Detection Logic

```javascript
// Adjacent sentence comparison
if (curr.text.slice(0, 5) === next.text.slice(0, 5)) {
  const shorter = curr.text.length <= next.text.length ? curr : next;
  markAsError(shorter);  // Delete whole sentence, not just repeated part
}

// Skip-one comparison (when middle is a short fragment)
if (mid.text.length <= 5) {  // middle is a fragment
  if (curr.text.slice(0, 5) === next.text.slice(0, 5)) {
    markAsError(curr);   // Delete previous sentence
    markAsError(mid);    // Delete fragment
  }
}
```

## Examples

| Earlier Sentence | Later Sentence | Delete |
|---|---|---|
| "This is an example I clipped" | "This is an example I clipped" | Earlier (exact duplicate) |
| "I used cloud code's excuse feature to make a clip agent" | "So I used cloud code's excuse feature to make a clip agent" | Earlier |
| "The second one is the q system second" | "The second one is the scale system" | Earlier |
| "Ok let's next start how to" | "Ok let's next start how to make a clip" | Earlier |

## Skip-One Duplicates (Fragment in Between)

When two sentences have a short fragment between them, also detect:

```
Sentence A: "This is an example I clipped"
Fragment:   "it"                              ← fragment in between
Sentence B: "This is an example I clipped"

→ Delete Sentence A + Fragment
```

## Multiple Repetitions

Said 3+ times consecutively: delete all incomplete versions, keep the last complete one:

```
"Before I would put all the skills"        → delete
"Before I would put all the features do"   → delete
"Before I would put all the features do a" → delete
"Before I would put all the features into a big scale" → keep
```

## Common Mistakes

```
❌ Scan character by character, only find partial repeated fragments
✓ Segment first, compare whole sentence beginnings, delete whole sentence

❌ Only compare adjacent sentences
✓ Also compare skip-one (middle may be a fragment)
```
