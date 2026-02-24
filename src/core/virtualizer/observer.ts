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
