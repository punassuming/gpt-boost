function createSnippet(text, start, length, radius = 48) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (!source) return "";
  const snippetStart = Math.max(0, start - radius);
  const snippetEnd = Math.min(source.length, start + length + radius);
  const prefix = snippetStart > 0 ? "…" : "";
  const suffix = snippetEnd < source.length ? "…" : "";
  return `${prefix}${source.slice(snippetStart, snippetEnd)}${suffix}`;
}

export function collectSearchTargets({
  ensureVirtualIds,
  getActiveConversationNodes,
  articleMap
}) {
  ensureVirtualIds();
  const entries = new Map();

  getActiveConversationNodes().forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const id = node.dataset.virtualId;
    if (!id) return;
    entries.set(id, node);
  });

  articleMap.forEach((node, id) => {
    if (!(node instanceof HTMLElement)) return;
    entries.set(id, node);
  });

  return entries;
}

export function summarizeSearchResult({
  result,
  index,
  total,
  articleMap,
  getMessageRole
}) {
  const id = result?.id;
  const node = articleMap.get(id);
  const role = node instanceof HTMLElement ? getMessageRole(node) : "message";
  const matchNumber = Number(result?.matchIndexWithinMessage || 0) + 1;

  return {
    title: result?.snippet || `Match ${index + 1}`,
    subtitle: `#${id} • hit ${matchNumber} • ${index + 1}/${total}`,
    role
  };
}

export function findSearchMatches(entries, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) {
    return {
      normalized,
      results: [],
      matchCount: 0
    };
  }

  const results = [];
  Array.from(entries.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([id, node]) => {
      const textSource = node instanceof HTMLElement
        ? (node.querySelector("[data-message-author-role]") || node)
        : null;
      const rawText = String(textSource?.textContent || "").replace(/\s+/g, " ").trim();
      const lowerText = rawText.toLowerCase();
      if (!lowerText) return;

      let start = lowerText.indexOf(normalized);
      let matchIndexWithinMessage = 0;
      while (start !== -1) {
        results.push({
          id,
          matchIndexWithinMessage,
          start,
          length: normalized.length,
          snippet: createSnippet(rawText, start, normalized.length)
        });
        matchIndexWithinMessage += 1;
        start = lowerText.indexOf(normalized, start + normalized.length);
      }
    });

  return {
    normalized,
    results,
    matchCount: results.length
  };
}
