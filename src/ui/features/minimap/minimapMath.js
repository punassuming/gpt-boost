export function clampRatio(value) {
  return Math.min(1, Math.max(0, value));
}

export function computeScrollTopFromRatio(ratio, maxScrollTop) {
  const safeRatio = clampRatio(ratio);
  return Math.round(safeRatio * Math.max(0, maxScrollTop));
}

export function computeViewportThumbLayout({
  trackHeight,
  visibleHeight,
  contentHeight,
  scrollTop,
  maxScrollTop,
  minViewportHeight = 24
}) {
  const safeTrackHeight = Math.max(1, Number(trackHeight) || 1);
  const safeVisibleHeight = Math.max(1, Number(visibleHeight) || 1);
  const safeContentHeight = Math.max(safeVisibleHeight, Number(contentHeight) || safeVisibleHeight);
  const safeMaxScrollTop = Math.max(0, Number(maxScrollTop) || 0);
  const safeScrollTop = Math.max(0, Number(scrollTop) || 0);

  const viewportRatio = Math.min(1, safeVisibleHeight / safeContentHeight);
  const viewportHeight = Math.max(minViewportHeight, Math.round(safeTrackHeight * viewportRatio));
  const maxViewportTop = Math.max(0, safeTrackHeight - viewportHeight);
  const scrollRatio = safeMaxScrollTop > 0 ? safeScrollTop / safeMaxScrollTop : 0;
  const viewportTop = Math.round(maxViewportTop * clampRatio(scrollRatio));

  return { viewportHeight, viewportTop };
}
