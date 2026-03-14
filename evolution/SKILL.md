---
name: videocut:evolution
description: Self-evolving skills. Record user feedback, update methodology and rules. Triggers: update rules, record feedback, improve skill
---

<!--
input: User feedback, error corrections
output: Updated documentation (CLAUDE.md or tips/*.md)
pos: Meta skill, lets the Agent learn from mistakes
-->

# Self-Evolution

> Let the Agent learn from mistakes and continuously improve

## Quick Usage

```
User: Record the issue from just now
User: Update the slip detection rules
User: This lesson should be noted
```

## Update Targets

| Content Type | Target File | Example |
|---|---|---|
| User profile | `CLAUDE.md` | Preferences, habits |
| Methodology + feedback | `*/tips/*.md` | Rules, lessons |
| Rule files | `rules/*.md` | Slip detection rules |

## Workflow

```
User triggers ("that just failed", "note this down")
    ↓
[Auto] Trace back context, identify the issue
    ↓
[Auto] Read the full target file, understand existing structure
    ↓
[Auto] Integrate into the relevant section (NOT just appending to the end!)
    ↓
[Auto] Feedback log records only events, does not duplicate rules
    ↓
Report update results
```

**Key**: Don't ask "what was the problem" — analyze from context directly!

## Update Principles

### ❌ Wrong: Append to the End

```markdown
## Feedback Log
### 2026-01-14
- Lesson: Review must include deletion task list at the end
- Lesson: User confirmation should separately confirm slips and silences
```

Only adding to the feedback log = rules scattered at the end, same mistakes will recur

### ✅ Correct: Integrate into the Body

1. **Read the full file**, understand the section structure
2. **Find the relevant position**, integrate the rule
3. **Feedback log records only events**: `- Review marked silences but they were missed during cut`

```markdown
## Section 4: Review Format
(Added deletion task list template)

## Section 5: Confirmation & Execution Flow  ← Add this section if missing
(Added separate confirmation flow for slips and silences)

## Feedback Log
### 2026-01-14
- Review marked silences but they were missed during cut (only slips were deleted)
```

## Trigger Conditions

- User corrects an AI error
- User says "remember this", "watch out for this in the future"
- A new general pattern is discovered

## Anti-Patterns

### 2026-01-13
```
❌ Wrong:
User: The last attempt failed, update the skills
AI: What problem did you find?  ← Should not ask!

✅ Correct:
AI: [Auto-traces context, finds failure point]
AI: [Executes update]
```

### 2026-01-14
```
❌ Wrong:
AI: Updated. Added 3 lessons to feedback log  ← Only appended to end!

✅ Correct:
AI: [Reads full file, understands structure]
AI: [Integrates into relevant section]
AI: [Feedback log records only events]
```

## Related Files

- `rules/` — Slip detection rule directory
- `SKILL.md` — Main clipping workflow definition
