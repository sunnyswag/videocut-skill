#!/usr/bin/env node
/**
 * 步骤 5.4: 脚本自动标记 ≥0.5s 静音到 auto_selected.json
 * 必须先执行此脚本，AI 分析口误时再追加
 *
 * 用法: node mark_silence.js [subtitles_words.json] [output_file]
 * 输出: auto_selected.json（仅含静音 idx）
 */

const fs = require('fs');
const path = require('path');

const dataFile = process.argv[2] || '../1_转录/subtitles_words.json';
const outFile = process.argv[3] || 'auto_selected.json';

if (!fs.existsSync(dataFile)) {
  console.error('❌ 找不到文件:', dataFile);
  process.exit(1);
}

const words = require(path.resolve(dataFile));
const selected = [];

words.forEach((w, i) => {
  if (w.isGap && (w.end - w.start) >= 0.5) selected.push(i);
});

fs.writeFileSync(outFile, JSON.stringify(selected, null, 2));
console.log('≥0.5s 静音数量:', selected.length);
console.log('✅ 已保存', outFile);
