#!/usr/bin/env node
/**
 * 将 edits.json 应用到 common/subtitles_words.json，写出 common/subtitles_words_edited.json
 *
 * pathSet 约定（所有下标 0-based）：
 *   { parent: i }                    → opted[i]（整个 item）
 *   { parent: i, children: [j, k] }  → opted[i].words[j], opted[i].words[k]（单个/多个子节点）
 *
 * 操作：deletes（标记删除）、textChanges（修正文字）、combines（合并多子节点）
 * 应用完成后自动由子节点文本重建父节点 text。
 *
 * 用法: node apply_edits.js <subtitles_words.json> [edits.json]
 * 输出: subtitles_words_edited.json（与输入同目录）
 */

const fs = require('fs');
const path = require('path');
const { applyEditsToOpted, deepClone } = require('./edits_utils');

const optedFile = process.argv[2] || 'common/subtitles_words.json';
const editsFile = process.argv[3] || path.join(path.dirname(path.resolve(optedFile)), '..', '2_analysis', 'edits.json');

if (!fs.existsSync(optedFile)) {
  console.error('❌ 找不到 opted 文件:', optedFile);
  process.exit(1);
}

const opted = JSON.parse(fs.readFileSync(optedFile, 'utf8'));

if (!Array.isArray(opted) || opted.length === 0) {
  console.error('❌ opted 不是数组或为空');
  process.exit(1);
}

if (!fs.existsSync(editsFile)) {
  console.error('❌ 找不到 edits 文件:', editsFile);
  process.exit(1);
}

const edits = JSON.parse(fs.readFileSync(editsFile, 'utf8'));
const edited = applyEditsToOpted(deepClone(opted), edits);

// 5. 输出
const outDir = path.dirname(path.resolve(optedFile));
const outFile = path.join(outDir, 'subtitles_words_edited.json');
fs.writeFileSync(outFile, JSON.stringify(edited, null, 2), 'utf8');
console.log('✅ 已保存', outFile);
