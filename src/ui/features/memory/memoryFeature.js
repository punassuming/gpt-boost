function formatRelativeDate(value) {
  const timestamp = Date.parse(String(value || ""));
  if (!timestamp) return "Not seen yet";
  const deltaMs = Date.now() - timestamp;
  const deltaHours = Math.max(0, Math.round(deltaMs / (1000 * 60 * 60)));
  if (deltaHours < 1) return "Seen just now";
  if (deltaHours < 24) return `Seen ${deltaHours}h ago`;
  const deltaDays = Math.round(deltaHours / 24);
  if (deltaDays < 7) return `Seen ${deltaDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function metaLine(parts) {
  return parts.filter(Boolean).join(" • ");
}

export function createMemoryFeature({
  deps
}) {
  const state = {
    query: "",
    requestId: 0,
    debounceTimer: null
  };

  function buildSectionTitle(theme, text) {
    const title = document.createElement("div");
    title.textContent = text;
    title.style.fontSize = "10px";
    title.style.letterSpacing = "0.12em";
    title.style.textTransform = "uppercase";
    title.style.color = theme.mutedText;
    title.style.opacity = "0.72";
    return title;
  }

  function createRowButton(theme) {
    const button = document.createElement("button");
    button.type = "button";
    button.style.display = "flex";
    button.style.flexDirection = "column";
    button.style.alignItems = "stretch";
    button.style.gap = "6px";
    button.style.width = "100%";
    button.style.padding = "10px 11px";
    button.style.textAlign = "left";
    button.style.cursor = "pointer";
    button.style.borderRadius = "12px";
    button.style.border = `1px solid ${theme.panelBorder}`;
    button.style.background = theme.inputBg;
    button.style.color = theme.text;
    button.style.fontFamily = "inherit";
    button.style.boxSizing = "border-box";
    return button;
  }

  function createSummaryCard(theme) {
    const card = document.createElement("div");
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "4px";
    card.style.padding = "10px 12px";
    card.style.borderRadius = "12px";
    card.style.border = `1px solid ${theme.panelBorder}`;
    card.style.background = theme.inputBg;
    return card;
  }

  function renderConversationList(list, conversations, theme) {
    list.innerHTML = "";
    if (!conversations.length) {
      const empty = document.createElement("div");
      empty.textContent = "No cached conversations yet. Open a few chats to build workspace memory.";
      empty.style.fontSize = "12px";
      empty.style.opacity = "0.72";
      empty.style.padding = "4px 2px";
      list.appendChild(empty);
      return;
    }

    list.appendChild(buildSectionTitle(theme, "Recent conversations"));
    conversations.forEach((conversation) => {
      const button = createRowButton(theme);
      button.addEventListener("click", () => deps.openConversation(conversation.key));

      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.alignItems = "center";
      topRow.style.justifyContent = "space-between";
      topRow.style.gap = "8px";

      const title = document.createElement("div");
      title.textContent = conversation.title + (conversation.isCurrent ? " • current" : "");
      title.style.fontSize = "12px";
      title.style.fontWeight = "600";
      title.style.lineHeight = "1.35";
      title.style.wordBreak = "break-word";

      const seen = document.createElement("div");
      seen.textContent = formatRelativeDate(conversation.lastSeenAt);
      seen.style.fontSize = "10px";
      seen.style.opacity = "0.72";
      seen.style.flexShrink = "0";

      const meta = document.createElement("div");
      meta.textContent = metaLine([
        conversation.messageCount ? `${conversation.messageCount} msgs` : "",
        conversation.visits ? `${conversation.visits} visits` : "",
        conversation.pinnedCount ? `${conversation.pinnedCount} pinned` : "",
        conversation.bookmarkedCount ? `${conversation.bookmarkedCount} saved` : ""
      ]);
      meta.style.fontSize = "10px";
      meta.style.opacity = "0.72";

      const preview = document.createElement("div");
      preview.textContent = conversation.note || conversation.preview || "No note or cached preview yet.";
      preview.style.fontSize = "12px";
      preview.style.lineHeight = "1.4";
      preview.style.opacity = conversation.note || conversation.preview ? "1" : "0.65";
      preview.style.wordBreak = "break-word";

      topRow.appendChild(title);
      topRow.appendChild(seen);
      button.appendChild(topRow);
      button.appendChild(meta);
      button.appendChild(preview);
      list.appendChild(button);
    });
  }

  function renderSearchResults(list, results, theme) {
    list.innerHTML = "";
    if (!results.length) {
      const empty = document.createElement("div");
      empty.textContent = "No cached matches found.";
      empty.style.fontSize = "12px";
      empty.style.opacity = "0.72";
      empty.style.padding = "4px 2px";
      list.appendChild(empty);
      return;
    }

    list.appendChild(buildSectionTitle(theme, "Cross-conversation matches"));
    results.forEach((result) => {
      const button = createRowButton(theme);
      const roleStyle = deps.getRoleSurfaceStyle(result.role, theme);
      button.style.borderLeft = `3px solid ${roleStyle.accentColor}`;
      button.style.background = roleStyle.surfaceBg;
      button.addEventListener("click", () => {
        deps.jumpToConversationMessage(result.conversationKey, result.messageKey || "");
      });

      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.alignItems = "center";
      topRow.style.justifyContent = "space-between";
      topRow.style.gap = "8px";

      const title = document.createElement("div");
      title.textContent = result.conversationTitle;
      title.style.fontSize = "12px";
      title.style.fontWeight = "600";
      title.style.lineHeight = "1.3";
      title.style.wordBreak = "break-word";

      const field = document.createElement("div");
      field.textContent = result.field === "message" ? "Message" : result.field;
      field.style.fontSize = "10px";
      field.style.opacity = "0.72";
      field.style.textTransform = "capitalize";
      field.style.flexShrink = "0";

      const snippet = document.createElement("div");
      snippet.textContent = result.snippet || "Untitled match";
      snippet.style.fontSize = "12px";
      snippet.style.lineHeight = "1.4";
      snippet.style.wordBreak = "break-word";

      const meta = document.createElement("div");
      meta.style.display = "flex";
      meta.style.alignItems = "center";
      meta.style.gap = "6px";

      const roleChip = deps.createRoleChip(roleStyle);
      const info = document.createElement("div");
      info.textContent = result.messageKey
        ? `Jump to saved message`
        : "Jump to conversation";
      info.style.fontSize = "10px";
      info.style.opacity = "0.72";

      topRow.appendChild(title);
      topRow.appendChild(field);
      meta.appendChild(roleChip);
      meta.appendChild(info);
      button.appendChild(topRow);
      button.appendChild(snippet);
      button.appendChild(meta);
      list.appendChild(button);
    });
  }

  function scheduleLoad(summary, list) {
    if (state.debounceTimer !== null) {
      clearTimeout(state.debounceTimer);
    }
    state.debounceTimer = setTimeout(() => {
      state.debounceTimer = null;
      void load(summary, list);
    }, 160);
  }

  async function load(summary, list) {
    const requestId = ++state.requestId;
    summary.textContent = state.query ? "Searching cached conversations..." : "Loading cached conversations...";
    list.innerHTML = "";

    try {
      const payload = await deps.loadWorkspaceMemory(state.query);
      if (requestId !== state.requestId || !summary.isConnected || !list.isConnected) return;

      const conversationCount = Number(payload?.conversations?.length || 0);
      const resultCount = Number(payload?.results?.length || 0);
      summary.textContent = state.query
        ? `${resultCount} cached match${resultCount === 1 ? "" : "es"} across ${conversationCount} conversation${conversationCount === 1 ? "" : "s"}`
        : `${conversationCount} cached conversation${conversationCount === 1 ? "" : "s"} in workspace memory`;

      if (state.query) {
        renderSearchResults(list, payload.results || [], deps.getThemeTokens());
      } else {
        renderConversationList(list, payload.conversations || [], deps.getThemeTokens());
      }
    } catch (_error) {
      if (requestId !== state.requestId || !summary.isConnected || !list.isConnected) return;
      summary.textContent = "Cached conversation data unavailable.";
      const error = document.createElement("div");
      error.textContent = "Unable to read workspace memory right now.";
      error.style.fontSize = "12px";
      error.style.opacity = "0.72";
      list.replaceChildren(error);
    }
  }

  function render(container) {
    const theme = deps.getThemeTokens();
    container.innerHTML = "";

    const summaryCard = createSummaryCard(theme);
    const label = buildSectionTitle(theme, "Workspace memory");
    const summary = document.createElement("div");
    summary.style.fontSize = "12px";
    summary.style.lineHeight = "1.4";
    summary.style.color = theme.text;
    summary.textContent = "Loading cached conversations...";
    summaryCard.appendChild(label);
    summaryCard.appendChild(summary);
    container.appendChild(summaryCard);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search every cached conversation...";
    input.setAttribute("aria-label", "Search workspace memory");
    input.value = state.query;
    input.style.height = "34px";
    input.style.borderRadius = "10px";
    input.style.padding = "0 11px";
    input.style.fontSize = "12px";
    input.style.fontFamily = "inherit";
    input.style.background = theme.inputBg;
    input.style.border = `1px solid ${theme.inputBorder}`;
    input.style.color = theme.text;
    input.style.boxSizing = "border-box";
    input.addEventListener("input", (event) => {
      state.query = event.target.value;
      scheduleLoad(summary, list);
    });
    container.appendChild(input);

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "8px";
    list.style.flex = "1";
    list.style.minHeight = "0";
    list.style.overflowY = "auto";
    container.appendChild(list);

    void load(summary, list);
    setTimeout(() => input.focus(), 0);
  }

  return {
    render
  };
}
