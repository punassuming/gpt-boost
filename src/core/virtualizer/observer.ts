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

  function isOwnSpacer(n: Node): boolean {
    return n instanceof HTMLElement && (n as HTMLElement).dataset.chatgptVirtualSpacer === "1";
  }

  function isArticleNode(n: Node, selector: string): boolean {
    return (
      n instanceof HTMLElement &&
      (n.matches(selector) || n.querySelector(selector) !== null)
    );
  }

  return new MutationObserver((records) => {
    onAnyChange();

    const hasArticleChange = records.some((r) => {
      const added = Array.from(r.addedNodes);
      const removed = Array.from(r.removedNodes);

      const addedHasSpacer = added.some(isOwnSpacer);
      const removedHasSpacer = removed.some(isOwnSpacer);
      const addedHasArticle = added.some((n) => isArticleNode(n, articleSelector));
      const removedHasArticle = removed.some((n) => isArticleNode(n, articleSelector));

      // Filter out the extension's own article↔spacer conversions to prevent oscillation
      if (removedHasArticle && addedHasSpacer) return false;
      if (removedHasSpacer && addedHasArticle) return false;

      return addedHasArticle || removedHasArticle;
    });

    if (!hasArticleChange) return;

    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      onStructuralChange();
    }, debounceMs);
  });
}
