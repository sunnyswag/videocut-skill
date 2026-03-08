#!/usr/bin/env node
/**
 * 视频剪辑核心模块（可 CLI / 可 require）
 *
 * CLI 用法:
 *   node 6_cut_video.js <input.mp4> <delete_segments.json> [output.mp4] [project_path]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUFFER_MS = 50;
const CROSSFADE_MS = 30;

function detectEncoder() {
  const platform = process.platform;
  const encoders = [];

  if (platform === 'darwin') {
    encoders.push({ name: 'h264_videotoolbox', args: '-q:v 60', label: 'VideoToolbox (macOS)' });
  } else if (platform === 'win32') {
    encoders.push({ name: 'h264_nvenc', args: '-preset p4 -cq 20', label: 'NVENC (NVIDIA)' });
    encoders.push({ name: 'h264_qsv', args: '-global_quality 20', label: 'QSV (Intel)' });
    encoders.push({ name: 'h264_amf', args: '-quality balanced', label: 'AMF (AMD)' });
  } else {
    encoders.push({ name: 'h264_nvenc', args: '-preset p4 -cq 20', label: 'NVENC (NVIDIA)' });
    encoders.push({ name: 'h264_vaapi', args: '-qp 20', label: 'VAAPI (Linux)' });
  }

  encoders.push({ name: 'libx264', args: '-preset fast -crf 18', label: 'x264 (软件)' });

  for (const enc of encoders) {
    try {
      execSync(`ffmpeg -hide_banner -encoders 2>/dev/null | grep ${enc.name}`, { stdio: 'pipe' });
      console.log(`🎯 检测到编码器: ${enc.label}`);
      return enc;
    } catch (e) {
      // continue
    }
  }

  return { name: 'libx264', args: '-preset fast -crf 18', label: 'x264 (软件)' };
}

let cachedEncoder = null;
function getEncoder() {
  if (!cachedEncoder) cachedEncoder = detectEncoder();
  return cachedEncoder;
}

function getAudioOffset(projectPath) {
  if (!projectPath) return 0;
  const audioPath = path.join(projectPath, '1_transcribe', 'audio.mp3');
  if (!fs.existsSync(audioPath)) return 0;

  try {
    const offsetCmd = `ffprobe -v error -show_entries format=start_time -of csv=p=0 "${audioPath}"`;
    const audioOffset = parseFloat(execSync(offsetCmd).toString().trim()) || 0;
    if (audioOffset > 0) {
      console.log(`🔧 检测到音频偏移: ${audioOffset.toFixed(3)}s，自动补偿`);
    }
    return audioOffset;
  } catch (e) {
    return 0;
  }
}

function getVideoDuration(inputPath) {
  const probeCmd = `ffprobe -v error -show_entries format=duration -of csv=p=0 "file:${inputPath}"`;
  return parseFloat(execSync(probeCmd).toString().trim());
}

function mergeDeleteSegments(segments) {
  const merged = [];
  for (const seg of segments) {
    if (!Number.isFinite(seg.start) || !Number.isFinite(seg.end) || seg.end <= seg.start) continue;
    if (merged.length === 0 || seg.start > merged[merged.length - 1].end) {
      merged.push({ ...seg });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, seg.end);
    }
  }
  return merged;
}

function computeCutPlan(inputPath, deleteList, projectPath) {
  const duration = getVideoDuration(inputPath);
  const audioOffset = getAudioOffset(projectPath);
  const bufferSec = BUFFER_MS / 1000;

  const expandedDelete = (Array.isArray(deleteList) ? deleteList : [])
    .map((seg) => ({
      start: Math.max(0, Number(seg.start || 0) - audioOffset - bufferSec),
      end: Math.min(duration, Number(seg.end || 0) - audioOffset + bufferSec)
    }))
    .sort((a, b) => a.start - b.start);

  const mergedDelete = mergeDeleteSegments(expandedDelete);
  const keepSegments = [];
  let cursor = 0;
  for (const del of mergedDelete) {
    if (del.start > cursor) keepSegments.push({ start: cursor, end: del.start });
    cursor = del.end;
  }
  if (cursor < duration) keepSegments.push({ start: cursor, end: duration });

  return {
    duration,
    audioOffset,
    bufferSec,
    crossfadeSec: CROSSFADE_MS / 1000,
    mergedDelete,
    keepSegments,
  };
}

function buildFilterComplex(keepSegments, crossfadeSec) {
  const filters = [];
  let vconcat = '';

  for (let i = 0; i < keepSegments.length; i += 1) {
    const seg = keepSegments[i];
    filters.push(`[0:v]trim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`);
    filters.push(`[0:a]atrim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`);
    vconcat += `[v${i}]`;
  }

  filters.push(`${vconcat}concat=n=${keepSegments.length}:v=1:a=0[outv]`);

  if (keepSegments.length === 1) {
    filters.push('[a0]anull[outa]');
  } else {
    let currentLabel = 'a0';
    for (let i = 1; i < keepSegments.length; i += 1) {
      const nextLabel = `a${i}`;
      const outLabel = (i === keepSegments.length - 1) ? 'outa' : `amid${i}`;
      filters.push(`[${currentLabel}][${nextLabel}]acrossfade=d=${crossfadeSec.toFixed(3)}:c1=tri:c2=tri[${outLabel}]`);
      currentLabel = outLabel;
    }
  }

  return filters.join(';');
}

function executeFFmpegCutFallback(inputPath, keepSegments, outputPath) {
  const tmpDir = `tmp_cut_${Date.now()}`;
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const partFiles = [];
    keepSegments.forEach((seg, i) => {
      const partFile = path.join(tmpDir, `part${i.toString().padStart(4, '0')}.mp4`);
      const segDuration = seg.end - seg.start;
      const encoder = getEncoder();
      const cmd = `ffmpeg -y -ss ${seg.start.toFixed(3)} -i "file:${inputPath}" -t ${segDuration.toFixed(3)} -c:v ${encoder.name} ${encoder.args} -c:a aac -b:a 128k -avoid_negative_ts make_zero "${partFile}"`;
      console.log(`切割片段 ${i + 1}/${keepSegments.length}: ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s`);
      execSync(cmd, { stdio: 'pipe' });
      partFiles.push(partFile);
    });

    const listFile = path.join(tmpDir, 'list.txt');
    const listContent = partFiles.map((f) => `file '${path.resolve(f)}'`).join('\n');
    fs.writeFileSync(listFile, listContent);

    const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`;
    console.log('合并片段...');
    execSync(concatCmd, { stdio: 'pipe' });
    console.log(`✅ 输出: ${outputPath}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function cutVideo(inputPath, deleteList, outputPath, projectPath) {
  if (!Array.isArray(deleteList) || deleteList.length === 0) {
    throw new Error('deleteList 不能为空');
  }

  const plan = computeCutPlan(inputPath, deleteList, projectPath);
  if (plan.keepSegments.length === 0) {
    throw new Error('删除范围覆盖整个视频，无法输出空视频');
  }

  console.log(`⚙️ 优化参数: 扩展范围=${BUFFER_MS}ms, 音频crossfade=${CROSSFADE_MS}ms`);
  console.log(`保留 ${plan.keepSegments.length} 个片段，删除 ${plan.mergedDelete.length} 个片段`);

  const filterComplex = buildFilterComplex(plan.keepSegments, plan.crossfadeSec);
  const encoder = getEncoder();
  console.log(`✂️ 执行 FFmpeg 精确剪辑（${encoder.label}）...`);

  const cmd = `ffmpeg -y -i "file:${inputPath}" -filter_complex "${filterComplex}" -map "[outv]" -map "[outa]" -c:v ${encoder.name} ${encoder.args} -c:a aac -b:a 192k "file:${outputPath}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✅ 输出: ${outputPath}`);
  } catch (err) {
    console.error('FFmpeg 执行失败，尝试分段方案...');
    executeFFmpegCutFallback(inputPath, plan.keepSegments, outputPath);
  }

  const newDuration = getVideoDuration(outputPath);
  console.log(`📹 新时长: ${newDuration.toFixed(2)}s`);

  return {
    outputPath,
    keepSegments: plan.keepSegments,
    mergedDelete: plan.mergedDelete,
    audioOffset: plan.audioOffset,
    originalDuration: plan.duration,
    newDuration,
  };
}

if (require.main === module) {
  const inputPath = process.argv[2];
  const deleteJsonPath = process.argv[3];
  const outputPath = process.argv[4] || path.join(path.dirname(inputPath || ''), `${path.basename(inputPath || '', '.mp4')}_cut.mp4`);
  const projectPath = process.argv[5];

  if (!inputPath || !deleteJsonPath) {
    console.error('用法: node 6_cut_video.js <input.mp4> <delete_segments.json> [output.mp4] [project_path]');
    process.exit(1);
  }
  if (!fs.existsSync(inputPath)) {
    console.error(`找不到输入文件: ${inputPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(deleteJsonPath)) {
    console.error(`找不到删除列表: ${deleteJsonPath}`);
    process.exit(1);
  }

  try {
    const deleteList = JSON.parse(fs.readFileSync(deleteJsonPath, 'utf8'));
    const result = cutVideo(inputPath, deleteList, outputPath, projectPath);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`❌ 剪辑失败: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  cutVideo,
  computeCutPlan,
};
