export function setupScrollTracking(
  scrollContainer: HTMLElement | Window,
  throttleMs: number,
  onScrollChange: () => void
): () => void {
  let lastCheckTime = 0;
  let frameId: number | null = null;

  const now =
    typeof performance !== "undefined" && performance.now
      ? () => performance.now()
      : () => Date.now();

  const runCheck = () => {
    const currentTime = now();
    if (currentTime - lastCheckTime < throttleMs) return;
    lastCheckTime = currentTime;
    onScrollChange();
  };

  const handleScroll = () => {
    if (frameId !== null) return;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      runCheck();
    });
  };

  scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
  runCheck();

  return () => {
    scrollContainer.removeEventListener("scroll", handleScroll);
    if (frameId !== null) cancelAnimationFrame(frameId);
  };
}

export function createDebouncedObserver(
  onMutation: () => void,
  delayMs: number
): MutationObserver {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  return new MutationObserver(() => {
    if (timerId !== null) clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = null;
      onMutation();
    }, delayMs);
  });
}

/**
 * Creates a MutationObserver that distinguishes article-level structural changes
 * from inner-content noise (e.g. ChatGPT's markdown re-rendering of SPAN/BR nodes).
 *
 * - onAnyChange fires immediately on every mutation batch (cheap, for scroll-container re-checks)
 * - onStructuralChange fires debounced only when article-level nodes are added or removed
 */
export function createArticleAwareMutationObserver(
  articleSelector: string,
  onStructuralChange: () => void,
  onAnyChange: () => void,
  debounceMs: number
): MutationObserver {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return new MutationObserver((records) => {
    onAnyChange();

    const hasArticleChange = records.some((r) =>
      [...Array.from(r.addedNodes), ...Array.from(r.removedNodes)].some(
        (n) =>
          n instanceof HTMLElement &&
          (n.matches(articleSelector) || n.querySelector(articleSelector) !== null)
      )
    );

    if (!hasArticleChange) return;

    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      onStructuralChange();
    }, debounceMs);
  });
}
