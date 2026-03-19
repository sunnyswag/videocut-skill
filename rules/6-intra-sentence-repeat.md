<!--
input: Sentence list segmented by silence
output: Intra-sentence repeat index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

## zh

# 句内重复检测

## 定义

同一句内，短语 A 重复出现，中间夹杂 1-3 个字。

## 模式

```
A + 中间字 + A
```

## 案例

| 原文 | 模式 | 删除 |
|------|------|------|
| 所以小所以 | 所以+小+所以 | "所以小" |
| 然后就会然后 | 然后+就会+然后 | "然后就会" |
| 任务3任务3 | 任务3+任务3 | 第一个 |
| 什么关系什么 | 什么+关系+什么 | "什么关系" |

## 不是口误

| 原文 | 原因 |
|------|------|
| 任务1任务2任务3 | 列举 |
| to do | 英文 |
| 一个一个地 | 强调 |

---

## en

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
