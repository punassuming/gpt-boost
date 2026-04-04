export function createFlagSyncManager({
  state,
  persistedPinnedMessageKeys,
  persistedBookmarkedMessageKeys,
  deps
}) {
  function syncFlagsFromPersistedKeys() {
    const nextPinned = new Set();
    const nextBookmarked = new Set();
    let migratedLegacyKeys = false;

    state.articleMap.forEach((article, virtualId) => {
      if (!(article instanceof HTMLElement)) return;
      const key = deps.getArticleMessageKey(article, virtualId);
      const legacyVirtualKey = `virtual:${virtualId}`;

      const hasPinned = persistedPinnedMessageKeys.has(key) || persistedPinnedMessageKeys.has(legacyVirtualKey);
      const hasBookmarked = persistedBookmarkedMessageKeys.has(key) || persistedBookmarkedMessageKeys.has(legacyVirtualKey);

      if (hasPinned) nextPinned.add(virtualId);
      if (hasBookmarked) nextBookmarked.add(virtualId);

      if (key !== legacyVirtualKey) {
        if (persistedPinnedMessageKeys.has(legacyVirtualKey)) {
          persistedPinnedMessageKeys.delete(legacyVirtualKey);
          persistedPinnedMessageKeys.add(key);
          migratedLegacyKeys = true;
        }
        if (persistedBookmarkedMessageKeys.has(legacyVirtualKey)) {
          persistedBookmarkedMessageKeys.delete(legacyVirtualKey);
          persistedBookmarkedMessageKeys.add(key);
          migratedLegacyKeys = true;
        }
      }
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
    if (migratedLegacyKeys) deps.scheduleFlagsSave();
    if (flagsChanged) deps.refreshSidebarTab();
  }

  return {
    syncFlagsFromPersistedKeys
  };
}
