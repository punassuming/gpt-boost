function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function resolveElementHeightPx(node, fallbackHeightPx = 1) {
  if (!(node instanceof HTMLElement)) return Math.max(1, Number(fallbackHeightPx) || 1);
  const rectHeight = node.getBoundingClientRect?.().height || 0;
  const inlineHeight = parseFloat(node.style?.height || "") || 0;
  return Math.max(1, rectHeight || node.offsetHeight || node.clientHeight || inlineHeight || Number(fallbackHeightPx) || 1);
}

function buildSilhouetteLineRatios(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [0.64];

  const words = normalized.split(" ").filter(Boolean);
  const lines = [];
  let currentLength = 0;
  const maxLineLength = 34;

  words.forEach((word) => {
    const nextLength = currentLength ? currentLength + 1 + word.length : word.length;
    if (currentLength > 0 && nextLength > maxLineLength) {
      lines.push(currentLength);
      currentLength = Math.min(word.length, maxLineLength);
      return;
    }
    currentLength = Math.min(nextLength, maxLineLength);
  });
  if (currentLength > 0) lines.push(currentLength);

  const trimmedLines = lines.slice(0, 3);
  const longest = Math.max(1, ...trimmedLines);
  const ratios = trimmedLines.map((lineLength, index) => {
    const normalizedRatio = lineLength / longest;
    const taper = index === trimmedLines.length - 1 ? 0.88 : 1;
    return Math.max(0.34, Math.min(1, normalizedRatio * taper));
  });

  if (!ratios.length) return [0.64];
  return ratios;
}

export function buildMinimapItems({
  ensureVirtualIds,
  articleMap,
  getMessageRole,
  getCodeSnippetVirtualIds,
  getSearchHitVirtualIds,
  getSearchHitRatiosByVirtualId,
  cache
}) {
  ensureVirtualIds();
  const entries = Array.from(articleMap.entries())
    .filter(([, node]) => node instanceof HTMLElement)
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  if (!entries.length) {
    if (cache instanceof Map) cache.clear();
    return [];
  }

  const total = entries.length;
  const searchHitIds = typeof getSearchHitVirtualIds === "function"
    ? getSearchHitVirtualIds()
    : new Set();
  const searchHitRatiosByVirtualId = typeof getSearchHitRatiosByVirtualId === "function"
    ? getSearchHitRatiosByVirtualId()
    : new Map();
  const codeSnippetIds = typeof getCodeSnippetVirtualIds === "function"
    ? getCodeSnippetVirtualIds()
    : new Set();
  const activeIds = new Set(entries.map(([id]) => id));

  if (cache instanceof Map) {
    Array.from(cache.keys()).forEach((id) => {
      if (!activeIds.has(id)) cache.delete(id);
    });
  }

  const spacerHeightById = new Map();
  document
    .querySelectorAll('div[data-chatgpt-virtual-spacer="1"][data-virtual-id]')
    .forEach((spacer) => {
      if (!(spacer instanceof HTMLElement)) return;
      const id = spacer.dataset.virtualId;
      if (!id) return;
      spacerHeightById.set(id, resolveElementHeightPx(spacer, parseFloat(spacer.style.height || "") || 1));
    });

  const itemSkeletons = entries.map(([id, node], index) => {
    const role = getMessageRole(node);
    const textSource = node.querySelector("[data-message-author-role]") || node;
    const text = normalizeText(textSource.textContent || "");
    const cached = cache instanceof Map ? cache.get(id) : null;
    const spacerHeightPx = spacerHeightById.get(id);
    const measuredHeightPx = node.isConnected
      ? resolveElementHeightPx(node, cached?.heightPx || spacerHeightPx || 1)
      : Math.max(1, Number(spacerHeightPx || cached?.heightPx || 1) || 1);
    const heightPx = Math.max(1, measuredHeightPx);

    let nextEntry = cached;
    const textChanged = !cached || cached.node !== node || cached.text !== text || cached.role !== role;
    const heightChanged = !cached || cached.heightPx !== heightPx;

    if (textChanged || heightChanged) {
      const lineRatios = textChanged
        ? buildSilhouetteLineRatios(text)
        : (cached?.lineRatios || buildSilhouetteLineRatios(text));
      nextEntry = {
        node,
        role,
        text,
        heightPx,
        lineRatios,
        lineCount: lineRatios.length
      };
      if (cache instanceof Map) cache.set(id, nextEntry);
    }

    const lineRatios = nextEntry?.lineRatios || buildSilhouetteLineRatios(text);
    const lineCount = nextEntry?.lineCount || lineRatios.length;
    return {
      id,
      role,
      position: index + 1,
      total,
      heightPx: nextEntry?.heightPx || heightPx,
      lineRatios,
      lineCount,
      hasSearchHit: searchHitIds instanceof Set ? searchHitIds.has(id) : false,
      searchMatchRatios: searchHitRatiosByVirtualId instanceof Map
        ? (searchHitRatiosByVirtualId.get(id) || [])
        : [],
      hasCodeSnippet: codeSnippetIds instanceof Set ? codeSnippetIds.has(id) : false
    };
  });

  const totalHeightPx = Math.max(
    1,
    itemSkeletons.reduce((sum, item) => sum + Math.max(1, Number(item.heightPx) || 1), 0)
  );

  let cumulativeHeightPx = 0;
  return itemSkeletons.map((item) => {
    const safeHeightPx = Math.max(1, Number(item.heightPx) || 1);
    const topRatio = cumulativeHeightPx / totalHeightPx;
    const heightRatio = safeHeightPx / totalHeightPx;
    cumulativeHeightPx += safeHeightPx;
    return {
      id: item.id,
      role: item.role,
      position: item.position,
      total: item.total,
      topRatio,
      heightRatio: Math.min(1, Math.max(0.006, heightRatio)),
      lineRatios: item.lineRatios,
      lineCount: item.lineCount,
      hasSearchHit: item.hasSearchHit,
      searchMatchRatios: item.searchMatchRatios,
      hasCodeSnippet: item.hasCodeSnippet
    };
  });
}

export function computeMarkerGeometry({
  trackHeight,
  topRatio,
  heightRatio,
  lineCount = 1
}) {
  const safeTrackHeight = Math.max(1, Number(trackHeight) || 1);
  const baseHeightPx = Math.max(
    4,
    Math.min(
      safeTrackHeight,
      Math.round(safeTrackHeight * Math.max(heightRatio, lineCount * 0.004))
    )
  );
  const maxTopPx = Math.max(0, safeTrackHeight - baseHeightPx);
  const topPx = Math.round(Math.max(0, Math.min(maxTopPx, topRatio * safeTrackHeight)));
  return {
    baseHeightPx,
    topPx
  };
}
