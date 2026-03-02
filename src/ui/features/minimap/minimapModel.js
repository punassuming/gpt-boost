export function buildMinimapItems({
  ensureVirtualIds,
  articleMap,
  getMessageRole
}) {
  ensureVirtualIds();
  const entries = Array.from(articleMap.entries())
    .filter(([, node]) => node instanceof HTMLElement)
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  if (!entries.length) return [];

  const total = entries.length;
  return entries.map(([id, node], index) => {
    const rect = node.getBoundingClientRect();
    const top = Number.isFinite(rect.top) ? rect.top : 0;
    const height = Math.max(1, Number.isFinite(rect.height) ? rect.height : node.offsetHeight || 1);
    const role = getMessageRole(node);
    return {
      id,
      role,
      position: index + 1,
      total,
      topRatio: total <= 1 ? 0 : index / (total - 1),
      heightRatio: total <= 0 ? 0 : Math.min(1, Math.max(0.004, height / Math.max(1, window.innerHeight))),
      top
    };
  });
}

export function computeMarkerGeometry({
  trackHeight,
  topRatio,
  heightRatio
}) {
  const baseHeightPx = Math.max(1, Math.min(12, Math.round(trackHeight * heightRatio)));
  const topPx = Math.round(Math.max(0, Math.min(trackHeight - 1, topRatio * trackHeight)));
  return {
    baseHeightPx,
    topPx
  };
}
