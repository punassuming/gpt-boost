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
  id,
  index,
  total,
  articleMap,
  getMessageRole,
  articleSnippetLength
}) {
  const node = articleMap.get(id);
  if (!(node instanceof HTMLElement)) {
    return {
      title: `Result ${index + 1}`,
      subtitle: `#${id} • ${index + 1}/${total}`,
      role: "message"
    };
  }

  const role = getMessageRole(node);
  const textSource = node.querySelector("[data-message-author-role]") || node;
  const raw = (textSource.textContent || "").trim().replace(/\s+/g, " ");
  const snippet =
    raw.length > articleSnippetLength
      ? raw.slice(0, articleSnippetLength) + "…"
      : raw;

  return {
    title: snippet || `Message ${id}`,
    subtitle: `#${id} • ${index + 1}/${total}`,
    role
  };
}

export function findSearchMatches(entries, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return {
      normalized,
      results: [],
      matchCount: 0
    };
  }

  const results = [];
  let matchCount = 0;

  entries.forEach((node, id) => {
    const text = (node.textContent || "").toLowerCase();
    if (!text) return;

    let index = text.indexOf(normalized);
    if (index === -1) return;

    results.push(id);
    while (index !== -1) {
      matchCount += 1;
      index = text.indexOf(normalized, index + normalized.length);
    }
  });

  return {
    normalized,
    results,
    matchCount
  };
}
