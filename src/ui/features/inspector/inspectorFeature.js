function createStatCard(theme, label, value) {
  const card = document.createElement("div");
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "4px";
  card.style.padding = "10px";
  card.style.borderRadius = "12px";
  card.style.border = `1px solid ${theme.panelBorder}`;
  card.style.background = theme.inputBg;

  const valueEl = document.createElement("div");
  valueEl.textContent = String(value);
  valueEl.style.fontSize = "16px";
  valueEl.style.fontWeight = "700";
  valueEl.style.lineHeight = "1";

  const labelEl = document.createElement("div");
  labelEl.textContent = label;
  labelEl.style.fontSize = "10px";
  labelEl.style.letterSpacing = "0.1em";
  labelEl.style.textTransform = "uppercase";
  labelEl.style.color = theme.mutedText;

  card.appendChild(valueEl);
  card.appendChild(labelEl);
  return card;
}

export function createInspectorFeature({
  state,
  deps
}) {
  const localState = {
    noteDraft: "",
    saveState: "idle"
  };

  function buildRoleCounts() {
    const counts = { user: 0, assistant: 0, other: 0 };
    state.articleMap.forEach((article) => {
      if (!(article instanceof HTMLElement)) return;
      const role = String(deps.getMessageRole(article) || "other").toLowerCase();
      if (role === "user") counts.user += 1;
      else if (role === "assistant") counts.assistant += 1;
      else counts.other += 1;
    });
    return counts;
  }

  async function hydrateMeta(summary, noteInput, noteMeta) {
    try {
      const payload = await deps.loadConversationInspector();
      if (!summary.isConnected || !noteInput.isConnected || !noteMeta.isConnected) return;
      localState.noteDraft = payload.note || "";
      noteInput.value = localState.noteDraft;
      summary.textContent = [
        payload.title || "Current conversation",
        payload.lastSeenAt ? `Seen ${new Date(payload.lastSeenAt).toLocaleDateString()}` : "",
        payload.visits ? `${payload.visits} visits` : ""
      ].filter(Boolean).join(" • ");
      noteMeta.textContent = payload.messageCount
        ? `${payload.messageCount} cached messages available to memory search`
        : "This conversation will appear here once cached.";
    } catch (_error) {
      if (!summary.isConnected || !noteMeta.isConnected) return;
      summary.textContent = "Current conversation";
      noteMeta.textContent = "Conversation metadata unavailable.";
    }
  }

  function render(container) {
    const theme = deps.getThemeTokens();
    const roleCounts = buildRoleCounts();
    container.innerHTML = "";

    const summary = document.createElement("div");
    summary.style.fontSize = "12px";
    summary.style.lineHeight = "1.4";
    summary.style.opacity = "0.82";
    summary.textContent = "Loading conversation inspector...";
    container.appendChild(summary);

    const statsGrid = document.createElement("div");
    statsGrid.style.display = "grid";
    statsGrid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    statsGrid.style.gap = "8px";
    statsGrid.appendChild(createStatCard(theme, "Messages", state.stats.totalMessages || 0));
    statsGrid.appendChild(createStatCard(theme, "Pinned", state.pinnedMessages.size));
    statsGrid.appendChild(createStatCard(theme, "Bookmarked", state.bookmarkedMessages.size));
    statsGrid.appendChild(createStatCard(theme, "Agents / Users", `${roleCounts.assistant}/${roleCounts.user}`));
    container.appendChild(statsGrid);

    const noteSection = document.createElement("div");
    noteSection.style.display = "flex";
    noteSection.style.flexDirection = "column";
    noteSection.style.gap = "8px";
    noteSection.style.padding = "10px 12px";
    noteSection.style.border = `1px solid ${theme.panelBorder}`;
    noteSection.style.borderRadius = "12px";
    noteSection.style.background = theme.inputBg;

    const noteLabel = document.createElement("div");
    noteLabel.textContent = "Conversation note";
    noteLabel.style.fontSize = "10px";
    noteLabel.style.letterSpacing = "0.12em";
    noteLabel.style.textTransform = "uppercase";
    noteLabel.style.color = theme.mutedText;

    const noteInput = document.createElement("textarea");
    noteInput.rows = 4;
    noteInput.placeholder = "Capture context, outcomes, or what matters about this chat.";
    noteInput.style.width = "100%";
    noteInput.style.boxSizing = "border-box";
    noteInput.style.resize = "vertical";
    noteInput.style.borderRadius = "10px";
    noteInput.style.padding = "10px";
    noteInput.style.fontSize = "12px";
    noteInput.style.fontFamily = "inherit";
    noteInput.style.border = `1px solid ${theme.inputBorder}`;
    noteInput.style.background = theme.panelBg;
    noteInput.style.color = theme.text;
    noteInput.addEventListener("input", (event) => {
      localState.noteDraft = event.target.value;
      localState.saveState = "dirty";
      saveMeta.textContent = "Unsaved changes";
    });

    const noteFooter = document.createElement("div");
    noteFooter.style.display = "flex";
    noteFooter.style.alignItems = "center";
    noteFooter.style.justifyContent = "space-between";
    noteFooter.style.gap = "8px";

    const noteMeta = document.createElement("div");
    noteMeta.style.fontSize = "10px";
    noteMeta.style.opacity = "0.72";
    noteMeta.textContent = "";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save Note";
    saveButton.style.border = `1px solid ${theme.panelBorder}`;
    saveButton.style.borderRadius = "10px";
    saveButton.style.padding = "8px 10px";
    saveButton.style.fontSize = "11px";
    saveButton.style.cursor = "pointer";
    saveButton.style.background = theme.buttonMutedBg;
    saveButton.style.color = theme.buttonMutedText;
    saveButton.style.fontFamily = "inherit";
    saveButton.addEventListener("click", async () => {
      saveButton.disabled = true;
      saveMeta.textContent = "Saving...";
      try {
        await deps.saveConversationNote(localState.noteDraft);
        localState.saveState = "saved";
        saveMeta.textContent = "Saved";
      } catch (_error) {
        saveMeta.textContent = "Save failed";
      } finally {
        saveButton.disabled = false;
      }
    });

    const saveMeta = document.createElement("div");
    saveMeta.style.fontSize = "10px";
    saveMeta.style.opacity = "0.72";
    saveMeta.textContent = "No local note yet";

    noteFooter.appendChild(noteMeta);
    noteFooter.appendChild(saveButton);

    noteSection.appendChild(noteLabel);
    noteSection.appendChild(noteInput);
    noteSection.appendChild(noteFooter);
    noteSection.appendChild(saveMeta);
    container.appendChild(noteSection);

    void hydrateMeta(summary, noteInput, noteMeta);
  }

  return {
    render
  };
}
