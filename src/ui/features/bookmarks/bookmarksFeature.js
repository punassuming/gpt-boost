export function createBookmarksFeature({
  state,
  constants,
  deps
}) {
  function toggleBookmark(virtualId) {
    if (!deps.getCurrentConversationKey()) {
      deps.setCurrentConversationKey(deps.getConversationStorageKey());
    }
    const article = state.articleMap.get(virtualId);
    const key = article instanceof HTMLElement ? deps.getArticleMessageKey(article, virtualId) : "";
    const persistedKeys = deps.getPersistedBookmarkedMessageKeys();

    if (state.bookmarkedMessages.has(virtualId)) {
      state.bookmarkedMessages.delete(virtualId);
      if (key) persistedKeys.delete(key);
    } else {
      state.bookmarkedMessages.add(virtualId);
      if (key) persistedKeys.add(key);
    }

    deps.scheduleFlagsSave();
    if (article) deps.updateBookmarkButtonAppearance(article, virtualId);
    deps.refreshSidebarTab();
  }

  function populateBookmarksPanel(panel) {
    const listContainer = panel.querySelector('[data-chatgpt-bookmarks="list"]');
    if (!(listContainer instanceof HTMLElement)) return;

    listContainer.innerHTML = "";
    const theme = deps.getThemeTokens();

    const appendSection = (titleText, ids, emptyText) => {
      const section = document.createElement("div");
      section.style.display = "flex";
      section.style.flexDirection = "column";
      section.style.gap = "6px";
      section.style.padding = "4px 0";

      const title = document.createElement("div");
      title.textContent = `${titleText} (${ids.length})`;
      title.style.fontSize = "10px";
      title.style.letterSpacing = "0.12em";
      title.style.textTransform = "uppercase";
      title.style.opacity = "0.72";
      section.appendChild(title);

      if (!ids.length) {
        const empty = document.createElement("div");
        empty.style.fontSize = "12px";
        empty.style.opacity = "0.6";
        empty.style.padding = "4px 2px";
        empty.textContent = emptyText;
        section.appendChild(empty);
        listContainer.appendChild(section);
        return;
      }

      ids.forEach((id, index) => {
        const article = state.articleMap.get(id);
        if (!article) return;

        const role = deps.getMessageRole(article);
        const roleStyle = deps.getRoleSurfaceStyle(role, theme);
        const textSource = article.querySelector("[data-message-author-role]") || article;
        const rawText = (textSource.textContent || "").trim().replace(/\s+/g, " ");
        const snippet = rawText.length > constants.minimapPromptSnippetLength
          ? rawText.slice(0, constants.minimapPromptSnippetLength) + "…"
          : rawText;

        const item = document.createElement("button");
        item.type = "button";
        item.style.display = "flex";
        item.style.flexDirection = "column";
        item.style.gap = "4px";
        item.style.flexShrink = "0";
        item.style.width = "100%";
        item.style.textAlign = "left";
        item.style.background = roleStyle.surfaceBg;
        item.style.border = `1px solid ${roleStyle.borderColor}`;
        item.style.borderLeft = `3px solid ${roleStyle.accentColor}`;
        item.style.borderRadius = "10px";
        item.style.padding = "6px 8px";
        item.style.cursor = "pointer";
        item.style.color = theme.text;
        item.style.wordBreak = "break-word";
        item.style.fontFamily = "inherit";
        item.addEventListener("mouseenter", () => { item.style.background = roleStyle.activeSurfaceBg; });
        item.addEventListener("mouseleave", () => { item.style.background = roleStyle.surfaceBg; });
        item.addEventListener("click", () => {
          deps.scrollToVirtualId(id);
        });

        const roleChip = deps.createRoleChip(roleStyle);

        const snippetLine = document.createElement("div");
        snippetLine.textContent = `${index + 1}. ${snippet}`;
        snippetLine.style.fontSize = "12px";
        snippetLine.style.lineHeight = "1.4";

        const metaLine = document.createElement("div");
        metaLine.textContent = `#${id} • ${index + 1}/${ids.length}`;
        metaLine.style.fontSize = "10px";
        metaLine.style.opacity = "0.72";

        item.appendChild(roleChip);
        item.appendChild(snippetLine);
        item.appendChild(metaLine);
        section.appendChild(item);
      });

      listContainer.appendChild(section);
    };

    const sortedPinnedIds = Array.from(state.pinnedMessages).sort((a, b) => Number(a) - Number(b));
    const sortedBookmarkedIds = Array.from(state.bookmarkedMessages).sort((a, b) => Number(a) - Number(b));
    appendSection("Pinned", sortedPinnedIds, "No pinned messages.");
    appendSection("Bookmarked", sortedBookmarkedIds, "No bookmarked messages.");
  }

  function showBookmarksPanel() {
    deps.openSidebar("bookmarks");
  }

  function toggleBookmarksPanel() {
    deps.toggleSidebar("bookmarks");
  }

  function hideBookmarksPanel() {
    // Sidebar-only bookmarks: no floating panel to hide.
  }

  function hideBookmarksUi() {
    // Sidebar-only bookmarks: no floating UI to hide.
  }

  function ensureBookmarksButton() {
    return null;
  }

  function ensureBookmarksPanel() {
    return null;
  }

  function updateBookmarksVisibility(totalMessages) {
    deps.updateSidebarVisibility(totalMessages);
  }

  return {
    toggleBookmark,
    hideBookmarksPanel,
    hideBookmarksUi,
    populateBookmarksPanel,
    showBookmarksPanel,
    toggleBookmarksPanel,
    ensureBookmarksButton,
    ensureBookmarksPanel,
    updateBookmarksVisibility
  };
}
