export function createOutlineFeature({
  state,
  deps
}) {
  function sortNumericIds(ids) {
    return Array.from(ids).sort((a, b) => Number(a) - Number(b));
  }

  function extractArticleText(article) {
    if (!(article instanceof HTMLElement)) return "";
    const textSource = article.querySelector("[data-message-author-role]") || article;
    return (textSource.textContent || "").trim().replace(/\s+/g, " ");
  }

  function sectionTitle(theme, text) {
    const title = document.createElement("div");
    title.textContent = text;
    title.style.fontSize = "10px";
    title.style.letterSpacing = "0.12em";
    title.style.textTransform = "uppercase";
    title.style.color = theme.mutedText;
    title.style.opacity = "0.72";
    return title;
  }

  function tinyActionButton(theme, label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.border = "none";
    button.style.borderRadius = "6px";
    button.style.padding = "2px 5px";
    button.style.fontSize = "10px";
    button.style.lineHeight = "1";
    button.style.cursor = "pointer";
    button.style.background = theme.buttonMutedBg;
    button.style.color = theme.buttonMutedText;
    button.addEventListener("click", onClick);
    return button;
  }

  function createMarksItem({
    id,
    article,
    index,
    theme,
    showPinnedMeta = false
  }) {
    if (!(article instanceof HTMLElement)) return null;
    const text = extractArticleText(article);
    if (!text) return null;

    const role = deps.getMessageRole(article);
    const roleStyle = deps.getRoleSurfaceStyle(role, theme);
    const isPinned = state.pinnedMessages.has(id);
    const isBookmarked = state.bookmarkedMessages.has(id);
    const isCollapsed = state.collapsedMessages.has(id);

    const item = document.createElement("div");
    item.style.border = `1px solid ${roleStyle.borderColor}`;
    item.style.borderLeft = `3px solid ${roleStyle.accentColor}`;
    item.style.borderRadius = "9px";
    item.style.padding = "4px 6px";
    item.style.display = "flex";
    item.style.flexShrink = "0";
    item.style.flexDirection = "column";
    item.style.gap = "4px";
    item.style.background = roleStyle.surfaceBg;
    item.style.width = "100%";
    item.style.boxSizing = "border-box";
    item.style.marginLeft = role === "assistant" ? "14px" : "0";

    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.alignItems = "center";
    topRow.style.justifyContent = "space-between";
    topRow.style.gap = "6px";

    const roleChip = deps.createRoleChip(roleStyle);

    const meta = document.createElement("div");
    meta.style.fontSize = "10px";
    meta.style.color = theme.mutedText;
    meta.style.opacity = "0.75";
    const badges = [];
    if (showPinnedMeta || isPinned) badges.push("PINNED");
    if (isBookmarked) badges.push("BOOKMARKED");
    if (isCollapsed) badges.push("COLLAPSED");
    meta.textContent = badges.length ? badges.join(" • ") : `#${id}`;

    topRow.appendChild(roleChip);
    topRow.appendChild(meta);

    const title = document.createElement("button");
    title.type = "button";
    title.textContent = `${index + 1}. ${text.slice(0, 96)}${text.length > 96 ? "…" : ""}`;
    title.style.textAlign = "left";
    title.style.border = "none";
    title.style.background = "transparent";
    title.style.padding = "0";
    title.style.cursor = "pointer";
    title.style.fontSize = "11px";
    title.style.lineHeight = "1.25";
    title.style.color = theme.text;
    title.style.fontFamily = "inherit";
    title.addEventListener("click", () => deps.scrollToVirtualId(id));

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.flexWrap = "wrap";
    actions.style.gap = "4px";
    actions.appendChild(tinyActionButton(theme, isPinned ? "Unpin" : "Pin", () => {
      deps.togglePin(id);
      deps.renderSidebarTab("bookmarks");
    }));
    actions.appendChild(tinyActionButton(theme, isBookmarked ? "Unbookmark" : "Bookmark", () => {
      deps.toggleBookmark(id);
      deps.renderSidebarTab("bookmarks");
    }));
    actions.appendChild(tinyActionButton(theme, isCollapsed ? "Expand" : "Collapse", () => {
      deps.toggleCollapse(id);
      deps.renderSidebarTab("bookmarks");
    }));

    item.appendChild(topRow);
    item.appendChild(title);
    item.appendChild(actions);
    return item;
  }

  function collapseAllMessages() {
    deps.ensureVirtualIds();
    state.articleMap.forEach((_article, id) => state.collapsedMessages.add(id));
    state.articleMap.forEach((article, id) => deps.applyCollapseState(article, id));
  }

  function expandAllMessages() {
    deps.ensureVirtualIds();
    state.collapsedMessages.clear();
    state.articleMap.forEach((article, id) => deps.applyCollapseState(article, id));
  }

  function renderMarksTabContent(container) {
    deps.ensureVirtualIds();
    const theme = deps.getThemeTokens();
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "4px";
    controls.style.marginBottom = "8px";

    const collapseAllBtn = document.createElement("button");
    collapseAllBtn.type = "button";
    collapseAllBtn.textContent = "Collapse All";
    collapseAllBtn.style.padding = "3px 7px";
    collapseAllBtn.style.fontSize = "10px";
    collapseAllBtn.style.border = "none";
    collapseAllBtn.style.borderRadius = "8px";
    collapseAllBtn.style.cursor = "pointer";
    collapseAllBtn.style.background = theme.buttonMutedBg;
    collapseAllBtn.style.color = theme.buttonMutedText;
    collapseAllBtn.addEventListener("click", () => {
      collapseAllMessages();
      deps.renderSidebarTab("bookmarks");
    });

    const expandAllBtn = document.createElement("button");
    expandAllBtn.type = "button";
    expandAllBtn.textContent = "Expand All";
    expandAllBtn.style.padding = "3px 7px";
    expandAllBtn.style.fontSize = "10px";
    expandAllBtn.style.border = "none";
    expandAllBtn.style.borderRadius = "8px";
    expandAllBtn.style.cursor = "pointer";
    expandAllBtn.style.background = theme.buttonMutedBg;
    expandAllBtn.style.color = theme.buttonMutedText;
    expandAllBtn.addEventListener("click", () => {
      expandAllMessages();
      deps.renderSidebarTab("bookmarks");
    });

    controls.appendChild(collapseAllBtn);
    controls.appendChild(expandAllBtn);
    container.appendChild(controls);

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "5px";
    list.style.overflowY = "auto";
    list.style.minHeight = "0";
    list.style.flex = "1";
    container.appendChild(list);

    const pinnedSection = document.createElement("div");
    pinnedSection.style.display = "flex";
    pinnedSection.style.flexDirection = "column";
    pinnedSection.style.gap = "4px";
    pinnedSection.appendChild(sectionTitle(theme, `Pinned (${state.pinnedMessages.size})`));

    const pinnedIds = sortNumericIds(state.pinnedMessages);
    if (!pinnedIds.length) {
      const empty = document.createElement("div");
      empty.textContent = "No pinned messages.";
      empty.style.fontSize = "11px";
      empty.style.color = theme.mutedText;
      empty.style.opacity = "0.7";
      empty.style.padding = "2px 2px 6px";
      pinnedSection.appendChild(empty);
    } else {
      pinnedIds.forEach((id, index) => {
        const article = state.articleMap.get(id);
        const item = createMarksItem({ id, article, index, theme, showPinnedMeta: true });
        if (item) pinnedSection.appendChild(item);
      });
    }
    list.appendChild(pinnedSection);

    const divider = document.createElement("div");
    divider.style.height = "1px";
    divider.style.background = theme.panelBorder;
    divider.style.opacity = "0.5";
    divider.style.margin = "2px 0";
    list.appendChild(divider);

    const outlineSection = document.createElement("div");
    outlineSection.style.display = "flex";
    outlineSection.style.flexDirection = "column";
    outlineSection.style.gap = "4px";
    outlineSection.appendChild(sectionTitle(theme, "Outline"));

    const entries = Array.from(state.articleMap.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
    entries.forEach(([id, article], index) => {
      const item = createMarksItem({ id, article, index, theme });
      if (item) outlineSection.appendChild(item);
    });
    list.appendChild(outlineSection);
  }

  function renderOutlineTabContent(container) {
    renderMarksTabContent(container);
  }

  return {
    collapseAllMessages,
    expandAllMessages,
    renderMarksTabContent,
    renderOutlineTabContent
  };
}
