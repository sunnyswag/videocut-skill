<!--
input: Sentence list segmented by silence
output: Incomplete sentence index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

## zh

# 残句检测

## 定义

话说到一半突然停住，后面接了静音或重新开始。

## 核心原则

**整句删除**：识别出残句后，从句首到句尾全部删除，不只是删结尾几个字。

## 正确分析方法

```
✓ 正确：先分句 → 判断完整性 → 整句删除
✗ 错误：逐字扫描 → 发现异常结尾 → 只删结尾
```

### 步骤

1. **先按静音切分句子**（静音≥0.5s作为分隔）
2. **判断每句是否完整**（语义、语法是否自然）
3. **残句整体标记删除**（从 startIdx 到 endIdx）

## 模式

```
残句(整句) + [静音] + 完整句
    ↓
  全删
```

## 案例

| 残句 | 后续 | 删除范围 |
|------|------|---------|
| "他呢" | [静音] + "这是我剪出来的..." | "他呢" 整句 |
| "为什么做这个东西呢一" | [静音] + "做这个东西的原因是" | **整句**（不只是"呢一"） |
| "分本区别就是剪映它虽然" | [静音3s] + "眼影它是没有学习能力的" | 整句 + 静音 |
| "我们先打具体怎么做呢" | "首先" | 整句 |
| "打开我们的AI" | [静音] + "打开我们的AI然后..." | 整句（前一个不完整版本） |

## 判断标准

1. **句子不完整**：缺少宾语、谓语或结尾不自然
2. **后接静音**：残句后通常有明显停顿
3. **后有重说**：重新开始说类似内容

## 与重复句的区别

- **重复句**：两句都完整，只是开头相同 → 删较短的
- **残句**：前一句明显不完整，被打断了 → 删不完整的整句

## 常见残句特征

- 以"呢"、"吧"、"的"等虚词结尾但不构成完整句
- 以数字、量词结尾但后面没有名词
- 句子戛然而止，语义不完整
- 话说一半被打断，后面重新开始

## 易错点

```
❌ 只删"呢一"（异常结尾）
✓ 删"为什么做这个东西呢一"（整个残句）
```

**切记**：残句的问题不只是结尾，而是整句都没说完，所以要整句删除。

---

## en

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
