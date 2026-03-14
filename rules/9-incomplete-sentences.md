<!--
input: Sentence list segmented by silence
output: Incomplete sentence index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

# Incomplete Sentence Detection

## Definition

A sentence that stops abruptly mid-way, followed by silence or a fresh start.

## Core Principle

**Delete the whole sentence**: Once an incomplete sentence is identified, delete from sentence start to sentence end — not just the trailing words.

## Correct Analysis Method

```
✓ Correct: Segment first → judge completeness → delete whole sentence
✗ Wrong: Scan character by character → find abnormal ending → delete ending only
```

### Steps

1. **Split by silence** (silence ≥0.5s as separator)
2. **Judge whether each sentence is complete** (is the semantics and grammar natural?)
3. **Mark the entire incomplete sentence for deletion** (from startIdx to endIdx)

## Pattern

```
Incomplete sentence (whole) + [silence] + Complete sentence
         ↓
      Delete all
```

## Examples

| Incomplete Sentence | What Follows | Deletion Scope |
|---|---|---|
| "it" | [silence] + "This is an example I clipped..." | "it" — whole sentence |
| "Why make this thing a-" | [silence] + "The reason for making this is" | **Whole sentence** (not just "a-") |
| "The difference is CapCut it although" | [silence 3s] + "CapCut has no learning ability" | Whole sentence + silence |
| "Let's first do specifically how to" | "first" | Whole sentence |
| "Open our AI" | [silence] + "Open our AI and then..." | Whole sentence (earlier incomplete version) |

## Judgment Criteria

1. **Sentence is incomplete**: Missing object, predicate, or unnatural ending
2. **Followed by silence**: Incomplete sentences usually have a noticeable pause after them
3. **Followed by re-take**: Speaker starts saying similar content again

## Difference from Duplicate Sentences

- **Duplicate sentence**: Both sentences are complete, just share the same beginning → delete the shorter one
- **Incomplete sentence**: The earlier sentence is clearly incomplete, interrupted → delete the whole incomplete sentence

## Common Characteristics of Incomplete Sentences

- Ends with function words but doesn't form a complete sentence
- Ends with numbers/quantifiers but no following noun
- Sentence stops abruptly, semantics incomplete
- Cut off mid-way, then started over

## Common Mistakes

```
❌ Only delete the abnormal ending
✓ Delete the entire incomplete sentence
```

**Remember**: The problem with an incomplete sentence is not just the ending — the whole sentence was never finished, so the entire sentence must be deleted.
