export function createArticleRegistry({
  state,
  deps
}) {
  function ensureVirtualIds() {
    const articleList = deps.getActiveConversationNodes();

    articleList.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;

      if (!node.dataset.virtualId) {
        const newId = String(state.nextVirtualId++);
        node.dataset.virtualId = newId;
        state.articleMap.set(newId, node);
        deps.getArticleMessageKey(node, newId);
        deps.injectArticleUi(node, newId);
      } else {
        const id = node.dataset.virtualId;
        if (id && !state.articleMap.has(id)) {
          state.articleMap.set(id, node);
          deps.getArticleMessageKey(node, id);
          deps.injectArticleUi(node, id);
        }
      }
    });
    deps.syncFlagsFromPersistedKeys();
  }

  function getViewportMetrics() {
    const scrollElement = state.scrollElement;

    if (
      scrollElement &&
      scrollElement !== document.body &&
      scrollElement !== document.documentElement &&
      scrollElement !== window &&
      scrollElement instanceof HTMLElement
    ) {
      const rect = scrollElement.getBoundingClientRect();
      const containerHeight = scrollElement.clientHeight;

      if (containerHeight > 0) {
        return { top: rect.top, height: containerHeight };
      }
    }

    return { top: 0, height: window.innerHeight };
  }

  return {
    ensureVirtualIds,
    getViewportMetrics
  };
}
