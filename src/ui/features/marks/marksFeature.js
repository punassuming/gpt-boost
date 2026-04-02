function formatSeen(value) {
  const timestamp = Date.parse(String(value || ""));
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString();
}

export function createMarksFeature({
  deps
}) {
  const state = {
    filter: "all",
    requestId: 0
  };

  function createFilterButton(theme, label, value) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.border = `1px solid ${theme.panelBorder}`;
    button.style.borderRadius = "999px";
    button.style.padding = "4px 9px";
    button.style.fontSize = "11px";
    button.style.cursor = "pointer";
    button.style.fontFamily = "inherit";
    button.style.background = state.filter === value ? theme.buttonBg : theme.buttonMutedBg;
    button.style.color = state.filter === value ? theme.buttonText : theme.buttonMutedText;
    button.addEventListener("click", () => {
      state.filter = value;
      deps.renderSidebarTab("marks");
    });
    return button;
  }

  function createItem(theme, item) {
    const roleStyle = deps.getRoleSurfaceStyle(item.role, theme);
    const button = document.createElement("button");
    button.type = "button";
    button.style.display = "flex";
    button.style.flexDirection = "column";
    button.style.gap = "6px";
    button.style.width = "100%";
    button.style.padding = "10px 11px";
    button.style.textAlign = "left";
    button.style.cursor = "pointer";
    button.style.borderRadius = "12px";
    button.style.border = `1px solid ${roleStyle.borderColor}`;
    button.style.borderLeft = `3px solid ${roleStyle.accentColor}`;
    button.style.background = roleStyle.surfaceBg;
    button.style.color = theme.text;
    button.style.fontFamily = "inherit";
    button.style.boxSizing = "border-box";
    button.addEventListener("click", () => {
      deps.jumpToConversationMessage(item.conversationKey, item.messageKey);
    });

    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.alignItems = "center";
    topRow.style.justifyContent = "space-between";
    topRow.style.gap = "8px";

    const title = document.createElement("div");
    title.textContent = item.conversationTitle + (item.isCurrent ? " • current" : "");
    title.style.fontSize = "12px";
    title.style.fontWeight = "600";
    title.style.wordBreak = "break-word";

    const badges = document.createElement("div");
    badges.textContent = [
      item.pinned ? "Pinned" : "",
      item.bookmarked ? "Bookmarked" : ""
    ].filter(Boolean).join(" + ");
    badges.style.fontSize = "10px";
    badges.style.opacity = "0.72";
    badges.style.flexShrink = "0";

    const snippet = document.createElement("div");
    snippet.textContent = item.snippet;
    snippet.style.fontSize = "12px";
    snippet.style.lineHeight = "1.4";
    snippet.style.wordBreak = "break-word";

    const meta = document.createElement("div");
    meta.style.display = "flex";
    meta.style.alignItems = "center";
    meta.style.gap = "6px";

    const roleChip = deps.createRoleChip(roleStyle);
    const info = document.createElement("div");
    info.textContent = [formatSeen(item.lastSeenAt), item.note ? "Has note" : ""].filter(Boolean).join(" • ") || "Jump to source";
    info.style.fontSize = "10px";
    info.style.opacity = "0.72";

    topRow.appendChild(title);
    topRow.appendChild(badges);
    meta.appendChild(roleChip);
    meta.appendChild(info);
    button.appendChild(topRow);
    button.appendChild(snippet);
    button.appendChild(meta);
    return button;
  }

  async function load(list, summary) {
    const requestId = ++state.requestId;
    summary.textContent = "Loading saved marks...";
    list.innerHTML = "";
    try {
      const allItems = await deps.loadCrossChatMarks();
      if (requestId !== state.requestId || !list.isConnected || !summary.isConnected) return;
      const items = allItems.filter((item) => {
        if (state.filter === "pinned") return item.pinned;
        if (state.filter === "bookmarked") return item.bookmarked;
        return true;
      });
      summary.textContent = `${items.length} cross-chat mark${items.length === 1 ? "" : "s"} available`;
      if (!items.length) {
        const empty = document.createElement("div");
        empty.textContent = "No saved marks found across cached conversations.";
        empty.style.fontSize = "12px";
        empty.style.opacity = "0.72";
        list.appendChild(empty);
        return;
      }
      items.forEach((item) => list.appendChild(createItem(deps.getThemeTokens(), item)));
    } catch (_error) {
      if (requestId !== state.requestId || !list.isConnected || !summary.isConnected) return;
      summary.textContent = "Saved marks unavailable.";
      const empty = document.createElement("div");
      empty.textContent = "Unable to read saved marks right now.";
      empty.style.fontSize = "12px";
      empty.style.opacity = "0.72";
      list.appendChild(empty);
    }
  }

  function render(container) {
    const theme = deps.getThemeTokens();
    container.innerHTML = "";

    const top = document.createElement("div");
    top.style.display = "flex";
    top.style.flexDirection = "column";
    top.style.gap = "8px";

    const summary = document.createElement("div");
    summary.style.fontSize = "12px";
    summary.style.lineHeight = "1.4";
    summary.textContent = "Loading saved marks...";

    const filters = document.createElement("div");
    filters.style.display = "flex";
    filters.style.flexWrap = "wrap";
    filters.style.gap = "6px";
    filters.appendChild(createFilterButton(theme, "All", "all"));
    filters.appendChild(createFilterButton(theme, "Pinned", "pinned"));
    filters.appendChild(createFilterButton(theme, "Bookmarked", "bookmarked"));

    top.appendChild(summary);
    top.appendChild(filters);
    container.appendChild(top);

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "8px";
    list.style.flex = "1";
    list.style.minHeight = "0";
    list.style.overflowY = "auto";
    container.appendChild(list);

    void load(list, summary);
  }

  return {
    render
  };
}
