<!--
Architecture guardian: Whenever this folder changes (add/delete/rename files), update this file
-->

# User Preferences

Personal preferences referenced during AI review.

## File List

| File | Type | Content |
|---|---|---|
| 1-core-principles.md | Principle | Delete earlier, keep later |
| 2-filler-words.md | Preference | um, uh, ah + deletion boundaries |
| 3-silence-handling.md | Threshold | ≤0.5s ignore, 0.5–1s optional, >1s suggest delete |
| 4-duplicate-sentences.md | Preference | Semantic compare adjacent sentences (strip filler prefixes), delete shorter/earlier |
| 5-stuttering.md | Preference | "that that", "so so" patterns |
| 6-intra-sentence-repeat.md | Preference | A + middle + A pattern |
| 7-consecutive-fillers.md | Preference | um-uh, ah-um |
| 8-self-correction.md | Preference | Partial repeat, negation correction, word interrupted |
| 9-incomplete-sentences.md | Preference | Sentence cut off mid-way |

## AI Review Priority Order

1. **Silence >1s** → suggest delete (split by 1-second grid)
2. **Incomplete sentence** → delete (cut off mid-way + silence)
3. **Duplicate sentence** → delete shorter/earlier (semantic compare, strip filler prefixes)
4. **Intra-sentence repeat** → delete A + middle (A + middle + A pattern)
5. **Stuttering** → delete earlier ("that that", "so so")
6. **Self-correction** → delete earlier (partial repeat, negation correction, word interrupted)
7. **Filler words** → mark for manual confirmation (um, uh, ah)

## Core Principle

**Delete earlier, keep later**: The later version is usually more complete — delete the earlier attempt, keep the later one.
