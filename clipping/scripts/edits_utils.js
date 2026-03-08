const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

function processEditItems(opted, items, onNode) {
  if (!Array.isArray(items)) return;
  for (const editItem of items) {
    const pathSet = editItem?.pathSet;
    if (!pathSet || !Number.isInteger(pathSet.parent)) continue;
    const parent = opted[pathSet.parent];
    if (!parent) continue;

    if (Array.isArray(pathSet.children) && pathSet.children.length > 0 && Array.isArray(parent.words)) {
      const sorted = [...pathSet.children].filter(Number.isInteger).sort((a, b) => a - b);
      sorted.forEach((childIdx, idx) => {
        const child = parent.words[childIdx];
        if (!child) return;
        onNode(child, parent, editItem, idx, childIdx);
      });
    } else {
      onNode(parent, parent, editItem, 0, undefined);
    }
  }
}

function rebuildText(items) {
  if (!Array.isArray(items)) return;
  for (const node of items) {
    if (Array.isArray(node.words) && node.words.length > 0) {
      rebuildText(node.words);
      node.text = node.words
        .filter((w) => w.opt !== 'del')
        .map((w) => (w.text || '').trim())
        .join('');
    }
  }
}

function applyEditsToOpted(inputOpted, edits = {}) {
  const opted = inputOpted;

  processEditItems(opted, edits.deletes, (node) => {
    node.opt = 'del';
  });

  processEditItems(opted, edits.textChanges, (node, _parent, editItem) => {
    node.text = String(editItem.newText);
    node.opt = 'edit';
  });

  processEditItems(opted, edits.combines, (() => {
    let first = null;
    return (node, _parent, editItem, i) => {
      if (i === 0) {
        first = node;
        node.text = String(editItem.newText);
        node.opt = 'edit';
      } else {
        if (typeof node.start_time === 'number' &&
            (typeof first.start_time !== 'number' || node.start_time < first.start_time)) {
          first.start_time = node.start_time;
        }
        if (typeof node.end_time === 'number' &&
            (typeof first.end_time !== 'number' || node.end_time > first.end_time)) {
          first.end_time = node.end_time;
        }
        node.opt = 'del';
      }
    };
  })());

  rebuildText(opted);
  return opted;
}

function mergeSegments(segments) {
  const sorted = segments
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const seg of sorted) {
    if (merged.length === 0 || seg.start > merged[merged.length - 1].end) {
      merged.push({ ...seg });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, seg.end);
    }
  }
  return merged;
}

function buildDeleteSegmentsFromDeletes(opted, deletes) {
  if (!Array.isArray(deletes) || deletes.length === 0) return [];

  const segments = [];
  for (const item of deletes) {
    if (Number.isFinite(item?.start) && Number.isFinite(item?.end)) {
      segments.push({ start: Number(item.start), end: Number(item.end) });
      continue;
    }
  }

  processEditItems(opted, deletes, (node, parent, editItem, _i, childIdx) => {
    const hasChildren = Array.isArray(editItem.pathSet?.children) && editItem.pathSet.children.length > 0;
    const sourceNode = hasChildren && typeof childIdx === 'number' ? parent.words[childIdx] : node;
    if (!sourceNode) return;
    const start = (sourceNode.start_time || parent.start_time || 0) / 1000;
    const end = (sourceNode.end_time || parent.end_time || 0) / 1000;
    segments.push({ start, end });
  });

  return mergeSegments(segments);
}

module.exports = {
  deepClone,
  processEditItems,
  rebuildText,
  applyEditsToOpted,
  mergeSegments,
  buildDeleteSegmentsFromDeletes,
};

