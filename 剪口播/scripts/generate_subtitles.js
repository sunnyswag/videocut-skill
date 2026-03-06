#!/usr/bin/env node
/**
 * 在 volcengine_result 上做 opt 与 gap 插入，输出 volcengine_result_opted.json
 *
 * - 删除所有 "attribute": { "event": "speech" }（保留根 attribute.extra）
 * - 为每个 utterance、每个 word 添加 opt: "keep"
 * - 在相邻两项时间间隔 > 100ms 处插入 gap 节点 { opt: "del", start_time, end_time, text: "" }
 *
 * 用法: node generate_subtitles.js <volcengine_result.json>
 * 输出: volcengine_result_opted.json（与输入同目录）
 */

const fs = require('fs');
const path = require('path');

const sourceFile = process.argv[2] || 'volcengine_result.json';
const GAP_MS = 100;

function removeSpeechAttribute(obj) {
  if (obj && typeof obj === 'object' && obj.attribute && obj.attribute.event === 'speech') {
    const keys = Object.keys(obj.attribute);
    if (keys.length === 1 && keys[0] === 'event') {
      delete obj.attribute;
    }
  }
}

function makeGapNode(startTime, endTime) {
  return { opt: 'blank', start_time: startTime, end_time: endTime };
}

function processEachItem(cur, preEndTime) {
  removeSpeechAttribute(cur);
  cur.opt = 'keep';

  const currStart = typeof cur.start_time === 'number' ? cur.start_time : preEndTime;
  const gapMs = currStart - preEndTime;
  return gapMs > GAP_MS ? makeGapNode(preEndTime, currStart) : undefined;
}

function loopItems(items, parent = null) {
  if (!Array.isArray(items)) return;
  for (let i = 0; i < items.length; i++) {
    const preEndTime = i > 0 ? items[i - 1].end_time : (parent ? parent.start_time : 0);
    const gap = processEachItem(items[i], preEndTime);
    if (gap) items.splice(i, 0, gap);
  }  
}

if (!fs.existsSync(sourceFile)) {
  console.error('❌ 找不到文件:', sourceFile);
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

const utterances = source.utterances;
if (!Array.isArray(utterances)) {
  console.error('❌ 缺少 utterances 数组');
  process.exit(1);
}

loopItems(utterances);
utterances.forEach(u => {
  if (u.opt !== 'del') loopItems(u.words, u);
});

const outDir = path.dirname(path.dirname(path.resolve(sourceFile)));
const outFile = path.join(outDir, "common", "subtitles_words.json");
fs.writeFileSync(outFile, JSON.stringify(utterances, null, 2), 'utf8');
console.log('✅ 已保存', outFile);
