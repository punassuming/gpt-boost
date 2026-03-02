export function createOutlineFeature({
  state,
  deps
}) {
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

  function renderOutlineTabContent(container) {
    const theme = deps.getThemeTokens();
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "6px";
    controls.style.marginBottom = "8px";

    const collapseAllBtn = document.createElement("button");
    collapseAllBtn.type = "button";
    collapseAllBtn.textContent = "Collapse All";
    collapseAllBtn.style.padding = "4px 8px";
    collapseAllBtn.style.fontSize = "11px";
    collapseAllBtn.style.border = "none";
    collapseAllBtn.style.borderRadius = "8px";
    collapseAllBtn.style.cursor = "pointer";
    collapseAllBtn.style.background = theme.buttonMutedBg;
    collapseAllBtn.style.color = theme.buttonMutedText;
    collapseAllBtn.addEventListener("click", () => {
      collapseAllMessages();
      deps.renderSidebarTab("outline");
    });

    const expandAllBtn = document.createElement("button");
    expandAllBtn.type = "button";
    expandAllBtn.textContent = "Expand All";
    expandAllBtn.style.padding = "4px 8px";
    expandAllBtn.style.fontSize = "11px";
    expandAllBtn.style.border = "none";
    expandAllBtn.style.borderRadius = "8px";
    expandAllBtn.style.cursor = "pointer";
    expandAllBtn.style.background = theme.buttonMutedBg;
    expandAllBtn.style.color = theme.buttonMutedText;
    expandAllBtn.addEventListener("click", () => {
      expandAllMessages();
      deps.renderSidebarTab("outline");
    });

    controls.appendChild(collapseAllBtn);
    controls.appendChild(expandAllBtn);
    container.appendChild(controls);

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "6px";
    list.style.overflowY = "auto";
    list.style.minHeight = "0";
    list.style.flex = "1";
    container.appendChild(list);

    const entries = Array.from(state.articleMap.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
    entries.forEach(([id, article], index) => {
      if (!(article instanceof HTMLElement)) return;
      const textSource = article.querySelector("[data-message-author-role]") || article;
      const text = (textSource.textContent || "").trim().replace(/\s+/g, " ");
      if (!text) return;
      const role = deps.getMessageRole(article);
      const roleStyle = deps.getRoleSurfaceStyle(role, theme);

      const item = document.createElement("div");
      item.style.border = `1px solid ${roleStyle.borderColor}`;
      item.style.borderLeft = `3px solid ${roleStyle.accentColor}`;
      item.style.borderRadius = "10px";
      item.style.padding = "6px 8px";
      item.style.display = "flex";
      item.style.flexShrink = "0";
      item.style.flexDirection = "column";
      item.style.gap = "6px";
      item.style.background = roleStyle.surfaceBg;
      item.style.width = "100%";

      const roleChip = deps.createRoleChip(roleStyle);

      const title = document.createElement("button");
      title.type = "button";
      title.textContent = `${index + 1}. ${text.slice(0, 90)}${text.length > 90 ? "…" : ""}`;
      title.style.textAlign = "left";
      title.style.border = "none";
      title.style.background = "transparent";
      title.style.padding = "0";
      title.style.cursor = "pointer";
      title.style.fontSize = "12px";
      title.style.color = theme.text;
      title.style.fontFamily = "inherit";
      title.addEventListener("click", () => deps.scrollToVirtualId(id));

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";

      const mkBtn = (label, onClick) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.style.border = "none";
        b.style.borderRadius = "6px";
        b.style.padding = "2px 6px";
        b.style.fontSize = "10px";
        b.style.cursor = "pointer";
        b.style.background = theme.buttonMutedBg;
        b.style.color = theme.buttonMutedText;
        b.addEventListener("click", onClick);
        return b;
      };

      actions.appendChild(mkBtn(state.pinnedMessages.has(id) ? "Unpin" : "Pin", () => {
        deps.togglePin(id);
        deps.renderSidebarTab("outline");
      }));
      actions.appendChild(mkBtn(state.bookmarkedMessages.has(id) ? "Unbookmark" : "Bookmark", () => {
        deps.toggleBookmark(id);
        deps.renderSidebarTab("outline");
      }));
      actions.appendChild(mkBtn(state.collapsedMessages.has(id) ? "Expand" : "Collapse", () => {
        deps.toggleCollapse(id);
        deps.renderSidebarTab("outline");
      }));

      item.appendChild(roleChip);
      item.appendChild(title);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  return {
    collapseAllMessages,
    expandAllMessages,
    renderOutlineTabContent
  };
}
