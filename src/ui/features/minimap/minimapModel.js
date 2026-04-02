function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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

  const trimmedLines = lines.slice(0, 5);
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
  const codeSnippetIds = typeof getCodeSnippetVirtualIds === "function"
    ? getCodeSnippetVirtualIds()
    : new Set();
  const activeIds = new Set(entries.map(([id]) => id));

  if (cache instanceof Map) {
    Array.from(cache.keys()).forEach((id) => {
      if (!activeIds.has(id)) cache.delete(id);
    });
  }

  return entries.map(([id, node], index) => {
    const role = getMessageRole(node);
    const textSource = node.querySelector("[data-message-author-role]") || node;
    const text = normalizeText(textSource.textContent || "");
    const cached = cache instanceof Map ? cache.get(id) : null;
    const heightPx = Math.max(1, node.offsetHeight || node.clientHeight || cached?.heightPx || 1);
    const heightRatio = total <= 0 ? 0 : Math.min(1, Math.max(0.012, heightPx / Math.max(1, window.innerHeight)));

    let nextEntry = cached;
    const textChanged = !cached || cached.node !== node || cached.text !== text || cached.role !== role;
    const heightChanged = !cached || cached.heightPx !== heightPx || cached.heightRatio !== heightRatio;

    if (textChanged || heightChanged) {
      const lineRatios = textChanged
        ? buildSilhouetteLineRatios(text)
        : (cached?.lineRatios || buildSilhouetteLineRatios(text));
      nextEntry = {
        node,
        role,
        text,
        heightPx,
        heightRatio,
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
      topRatio: total <= 1 ? 0 : index / (total - 1),
      heightRatio: nextEntry?.heightRatio || heightRatio,
      lineRatios,
      lineCount,
      hasSearchHit: searchHitIds instanceof Set ? searchHitIds.has(id) : false,
      hasCodeSnippet: codeSnippetIds instanceof Set ? codeSnippetIds.has(id) : false
    };
  });
}

export function computeMarkerGeometry({
  trackHeight,
  topRatio,
  heightRatio,
  lineCount = 1
}) {
  const baseHeightPx = Math.max(
    6,
    Math.min(26, Math.round(trackHeight * Math.max(heightRatio, lineCount * 0.012)))
  );
  const topPx = Math.round(Math.max(0, Math.min(trackHeight - 1, topRatio * trackHeight)));
  return {
    baseHeightPx,
    topPx
  };
}
