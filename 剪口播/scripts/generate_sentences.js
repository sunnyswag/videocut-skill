#!/usr/bin/env node
/**
 * 步骤 5.3: 按静音切分生成句子列表 sentences.txt
 *
 * 用法: node generate_sentences.js [subtitles_words.json] [output_file]
 * 输出: sentences.txt (行号|startIdx-endIdx|文本)
 */

const fs = require('fs');
const path = require('path');

const dataFile = process.argv[2] || '../1_转录/subtitles_words.json';
const outFile = process.argv[3] || 'sentences.txt';

if (!fs.existsSync(dataFile)) {
  console.error('❌ 找不到文件:', dataFile);
  process.exit(1);
}

const data = require(path.resolve(dataFile));
const sentences = [];
let curr = { text: '', startIdx: -1, endIdx: -1 };

data.forEach((w, i) => {
  const isLongGap = w.isGap && (w.end - w.start) >= 0.5;
  if (isLongGap) {
    if (curr.text.length > 0) sentences.push({ ...curr });
    curr = { text: '', startIdx: -1, endIdx: -1 };
  } else if (!w.isGap) {
    if (curr.startIdx === -1) curr.startIdx = i;
    curr.text += w.text;
    curr.endIdx = i;
  }
});
if (curr.text.length > 0) sentences.push(curr);

const lines = sentences.map((s, i) => i + '|' + s.startIdx + '-' + s.endIdx + '|' + s.text);
fs.writeFileSync(outFile, lines.join('\n'));
console.log('✅ 已保存', outFile, '(' + sentences.length + ' 句)');
