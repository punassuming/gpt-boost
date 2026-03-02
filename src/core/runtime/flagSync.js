export function createFlagSyncManager({
  state,
  persistedPinnedMessageKeys,
  persistedBookmarkedMessageKeys,
  deps
}) {
  function syncFlagsFromPersistedKeys() {
    const nextPinned = new Set();
    const nextBookmarked = new Set();

    state.articleMap.forEach((article, virtualId) => {
      if (!(article instanceof HTMLElement)) return;
      const key = deps.getArticleMessageKey(article, virtualId);
      if (persistedPinnedMessageKeys.has(key)) nextPinned.add(virtualId);
      if (persistedBookmarkedMessageKeys.has(key)) nextBookmarked.add(virtualId);
    });

    const prevPinned = state.pinnedMessages;
    const prevBookmarked = state.bookmarkedMessages;
    const flagsChanged =
      prevPinned.size !== nextPinned.size ||
      prevBookmarked.size !== nextBookmarked.size ||
      Array.from(nextPinned).some((id) => !prevPinned.has(id)) ||
      Array.from(nextBookmarked).some((id) => !prevBookmarked.has(id));

    state.pinnedMessages = nextPinned;
    state.bookmarkedMessages = nextBookmarked;
    deps.updatePinnedBar();
    state.articleMap.forEach((article, virtualId) => {
      deps.updatePinButtonAppearance(article, virtualId);
      deps.updateBookmarkButtonAppearance(article, virtualId);
    });
    if (flagsChanged) deps.refreshSidebarTab();
  }

  return {
    syncFlagsFromPersistedKeys
  };
}
