<!--
input: Sentence list segmented by silence
output: Duplicate sentence index list
pos: Rule, suggest-delete priority

Architecture guardian: If modified, please also update:
1. This folder's README.md
-->

## zh

# 重复句检测

## 定义

相邻句子（被静音分隔）表达同一意思，通常是说错后重说。不要仅靠字面前缀匹配——说话人经常在重说时换用不同的开头（加/去掉"就是"、"那个"、"然后"等口头禅前缀），核心内容相同即视为重复。

## 核心原则

**先分句，再语义比对**：必须先按静音切分成句子列表，然后语义比对相邻句子。

## 正确分析方法

```
✓ 正确：按静音切分句子 → 语义比对相邻句子（去掉口头禅前缀后看核心内容是否相同） → 整句删除
✗ 错误：仅按前 N 个字符机械匹配 → 遗漏有不同前缀但内容相同的重复句
✗ 错误：逐字扫描 → 发现重复片段 → 只删片段
```

### 步骤

1. **按静音切分句子**（静音≥0.5s作为分隔）
2. **去口头禅前缀**：strip 常见前缀词（"就是"、"那个"、"然后"、"所以"、"嗯"、"那"、"好"）后比对
3. **语义比对相邻句子**（核心内容相同 → 删较短或较早的整句）
4. **比对隔一句**（中间是残句时，也要检查前后句是否重复）

## 检测逻辑

```javascript
const FILLER_PREFIXES = ['就是', '那个', '然后', '所以', '嗯', '那', '好'];

function stripFillerPrefix(text) {
  let s = text;
  for (const p of FILLER_PREFIXES) {
    if (s.startsWith(p)) { s = s.slice(p.length); break; }
  }
  return s;
}

// 相邻句子比对（语义相似度）
const a = stripFillerPrefix(curr.text);
const b = stripFillerPrefix(next.text);
if (isSameIntent(a, b)) {
  // 较短 / 较早的是重复句，删整句
  const toDelete = curr.text.length <= next.text.length ? curr : next;
  markAsError(toDelete);
}

// 隔一句比对（中间是短句/残句时）
if (mid.text.length <= 8 || isFragment(mid)) {
  const a2 = stripFillerPrefix(curr.text);
  const b2 = stripFillerPrefix(next.text);
  if (isSameIntent(a2, b2)) {
    markAsError(curr);   // 删前句
    markAsError(mid);    // 删残句
  }
}
```

> `isSameIntent(a, b)`: 两者核心内容是否表达同一件事。可以是前缀匹配、也可以是整体语义相同但措辞略有不同（换了同义词、补全了残缺部分等）。

## 案例

| 前句 | 后句 | 删除 | 说明 |
|------|------|------|------|
| "这是我剪出来的一个案例" | "这是我剪出来的一个案例" | 前句 | 完全重复 |
| "我用cloud code的excuse功能做一个剪辑agent" | "所以我用cloud code的excuse功能做一个剪辑agent" | 前句 | 后句多了"所以"前缀，核心相同 |
| "第二个是是q制技能系统第二个" | "第二个是scale技能系统" | 前句 | 前句有口误，后句是修正版 |
| "好我们接下来开始怎么去" | "好我们接下来开始怎么去做一个剪口拨" | 前句 | 前句被截断，后句更完整 |
| "我们就可以看到这里新的视频" | "我们就可以看到这里新的视频了" | 前句 | 几乎相同，后句更完整 |
| "这里的话可以看" | "具体的描述可以看上一期视频吧" | 前句 | 前句是模糊开头，后句是清晰重述 |

## 隔一句重复（中间有残句）

当两句之间隔了一个短残句时，也要检测：

```
句A: "这是我剪出来的一个案例"
残句: "他呢"                    ← 中间隔了残句
句B: "这是我剪出来的一个案例"

→ 删 句A + 残句
```

| 前句 | 中间残句 | 后句 | 删除 |
|------|---------|------|------|
| "这是我剪出来的一个案例" | "他呢" | "这是我剪出来的一个案例" | 前句 + 残句 |
| "具体怎么做呢我们首先下载这个" | "提示词" | "具体怎么做呢我们首先复制这个提示词" | 前句 + 残句 |
| "打开我们的AI" | "打开我们的" | "打开我们的AI然后告诉他去下载" | 前句 + 残句 |

## 多次重复

连续说 3 次以上，删除所有不完整的，保留最后完整的：

```
"以前呢我会把所有的技能"     → 删
"以前呢我会把所有的功能做"   → 删
"以前呢我会把所有的功能做都" → 删
"以前呢我会把所有的功能都做成一个大的scale" → 保留
```

## 易错点

```
❌ 仅按前 5 个字符机械匹配，遗漏换了前缀的重复句
✓ 去掉口头禅前缀后语义比对核心内容

❌ 逐字扫描，只发现局部重复片段
✓ 先分句，语义比对，删除整句

❌ 只比对相邻句子
✓ 也要比对隔一句（中间可能是残句）
```

---

## en

# Duplicate Sentence Detection

## Definition

Adjacent sentences (separated by silence) convey the same meaning, usually indicating a re-take after a mistake. Do not rely solely on literal prefix matching — speakers often add or drop filler prefixes ("so", "well", "like", "you know") when re-stating. If the core content is the same, treat it as a duplicate.

## Core Principle

**Segment first, then semantic compare**: Must first split by silence into a sentence list, then semantically compare adjacent sentences.

## Correct Analysis Method

```
✓ Correct: Split by silence → strip filler prefixes → semantic compare core content → delete whole sentence
✗ Wrong: Match only the first N characters mechanically → miss duplicates with different prefixes
✗ Wrong: Scan character by character → find repeated fragments → delete fragment only
```

### Steps

1. **Split by silence** (silence ≥0.5s as separator)
2. **Strip filler prefixes**: Remove common filler starters ("so", "well", "like", "you know", "I mean") before comparing
3. **Semantic compare adjacent sentences** (same core content → delete the shorter or earlier whole sentence)
4. **Compare skip-one sentences** (when middle is a fragment, also check whether before/after sentences are duplicates)

## Detection Logic

```javascript
const FILLER_PREFIXES = ['so ', 'well ', 'like ', 'you know ', 'I mean '];

function stripFillerPrefix(text) {
  let s = text.toLowerCase();
  for (const p of FILLER_PREFIXES) {
    if (s.startsWith(p)) { s = s.slice(p.length); break; }
  }
  return s;
}

// Adjacent sentence comparison (semantic similarity)
const a = stripFillerPrefix(curr.text);
const b = stripFillerPrefix(next.text);
if (isSameIntent(a, b)) {
  const toDelete = curr.text.length <= next.text.length ? curr : next;
  markAsError(toDelete);
}

// Skip-one comparison (when middle is a short fragment)
if (mid.text.length <= 8 || isFragment(mid)) {
  const a2 = stripFillerPrefix(curr.text);
  const b2 = stripFillerPrefix(next.text);
  if (isSameIntent(a2, b2)) {
    markAsError(curr);   // Delete previous sentence
    markAsError(mid);    // Delete fragment
  }
}
```

> `isSameIntent(a, b)`: Whether the two share the same core meaning — could be prefix overlap, or overall same intent with slightly different wording (synonym substitution, completion of truncated parts, etc.)

## Examples

| Earlier Sentence | Later Sentence | Delete | Reason |
|---|---|---|---|
| "This is an example I clipped" | "This is an example I clipped" | Earlier | Exact duplicate |
| "I used cloud code's excuse feature to make a clip agent" | "So I used cloud code's excuse feature to make a clip agent" | Earlier | Later has "So" prefix, core identical |
| "The second one is the q system second" | "The second one is the scale system" | Earlier | Earlier is garbled, later is corrected |
| "Ok let's next start how to" | "Ok let's next start how to make a clip" | Earlier | Earlier truncated, later complete |
| "You can sort of see" | "The specific description you can see in the last video" | Earlier | Earlier is vague start, later is clear restatement |

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
❌ Match only the first 5 characters mechanically — misses duplicates with different prefixes
✓ Strip filler prefixes, then semantic compare core content

❌ Scan character by character, only find partial repeated fragments
✓ Segment first, semantic compare, delete whole sentence

❌ Only compare adjacent sentences
✓ Also compare skip-one (middle may be a fragment)
```
