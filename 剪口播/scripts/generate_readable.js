#!/usr/bin/env node
/**
 * 步骤 5.1: 生成易读格式 readable.txt
 *
 * 用法: node generate_readable.js [subtitles_words.json]
 * 输出: readable.txt (idx|内容|时间)
 */

const fs = require('fs');

const dataFile = process.argv[2] || '../1_转录/subtitles_words.json';

if (!fs.existsSync(dataFile)) {
  console.error('❌ 找不到文件:', dataFile);
  process.exit(1);
}

const data = require(require('path').resolve(dataFile));
const output = [];

// 兼容 opt / isGap
const isGap = (w) => w.opt === 'del';
data.forEach((w, i) => {
  if (isGap(w)) {
    const dur = (w.end - w.start).toFixed(2);
    if (dur >= 0.5) {
      output.push(i + '|[静' + dur + 's]|' + w.start.toFixed(2) + '-' + w.end.toFixed(2));
    }
  } else {
    output.push(i + '|' + w.text + '|' + w.start.toFixed(2) + '-' + w.end.toFixed(2));
  }
});

fs.writeFileSync('readable.txt', output.join('\n'));
console.log('✅ 已保存 readable.txt');
