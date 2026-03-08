const { execSync } = require('child_process');

function formatSrtTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.round((safe % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function generateSrt(subtitles) {
  return subtitles.map((s, i) => `${i + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n`).join('\n');
}

function remapIntervalToKeepSegments(start, end, keepSegments) {
  const out = [];
  let cumulative = 0;
  keepSegments.forEach((seg) => {
    const overlapStart = Math.max(start, seg.start);
    const overlapEnd = Math.min(end, seg.end);
    if (overlapEnd > overlapStart) {
      out.push({
        start: cumulative + (overlapStart - seg.start),
        end: cumulative + (overlapEnd - seg.start)
      });
    }
    cumulative += seg.end - seg.start;
  });
  return out;
}

function buildSubtitlesFromEditedOpted(editedOpted, audioOffset, keepSegments) {
  const sourceSubs = [];
  editedOpted.forEach((node) => {
    if (Array.isArray(node.words) && node.words.length > 0) {
      const keptWords = [];
      node.words.forEach((w) => {
        if ((w.opt || node.opt || 'keep') === 'del') return;
        const text = (w.text || '').trim();
        if (!text) return;
        keptWords.push({
          text,
          start: (typeof w.start_time === 'number' ? w.start_time : node.start_time || 0) / 1000 - audioOffset,
          end: (typeof w.end_time === 'number' ? w.end_time : node.end_time || 0) / 1000 - audioOffset
        });
      });
      if (keptWords.length > 0) {
        sourceSubs.push({
          text: keptWords.map((w) => w.text).join(''),
          start: keptWords[0].start,
          end: keptWords[keptWords.length - 1].end
        });
      }
      return;
    }

    if ((node.opt || 'keep') === 'del') return;
    const text = (node.text || '').trim();
    if (!text) return;
    sourceSubs.push({
      text,
      start: (node.start_time || 0) / 1000 - audioOffset,
      end: (node.end_time || 0) / 1000 - audioOffset
    });
  });

  const remapped = [];
  sourceSubs.forEach((sub) => {
    remapIntervalToKeepSegments(sub.start, sub.end, keepSegments).forEach((seg) => {
      if (seg.end - seg.start < 0.05) return;
      remapped.push({ text: sub.text, start: seg.start, end: seg.end });
    });
  });
  return remapped;
}

function burnSubtitles(videoPath, srtPath, outputPath) {
  const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const filter = `subtitles='${escapedSrtPath}':force_style='FontSize=22,FontName=PingFang SC,Bold=1,PrimaryColour=&H0000deff,OutlineColour=&H00000000,Outline=2,Alignment=2,MarginV=30'`;
  const cmd = `ffmpeg -y -i "file:${videoPath}" -vf "${filter}" -c:a copy "file:${outputPath}"`;
  execSync(cmd, { stdio: 'pipe' });
}

module.exports = {
  formatSrtTime,
  generateSrt,
  buildSubtitlesFromEditedOpted,
  burnSubtitles,
};

