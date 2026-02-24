export function renderSidebarSettingsTab({
  container,
  storage,
  theme,
  state,
  config,
  uiSettings,
  defaults,
  constants,
  helpers,
  callbacks
}) {
  const controlList = document.createElement("div");
  controlList.style.display = "flex";
  controlList.style.flexDirection = "column";
  controlList.style.gap = "10px";
  controlList.style.overflowY = "auto";
  controlList.style.flex = "1";
  controlList.style.minHeight = "0";
  container.appendChild(controlList);

  const sectionTitle = (text) => {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.fontSize = "10px";
    el.style.letterSpacing = "0.12em";
    el.style.textTransform = "uppercase";
    el.style.opacity = "0.72";
    el.style.marginTop = "4px";
    return el;
  };

  const createInputShell = () => {
    const shell = document.createElement("div");
    shell.style.display = "inline-flex";
    shell.style.alignItems = "center";
    shell.style.gap = "6px";
    shell.style.flexShrink = "0";
    return shell;
  };

  const settingRow = (titleText, descriptionText, control) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "10px";
    row.style.padding = "8px 0";
    row.style.borderBottom = `1px solid ${theme.panelBorder}`;

    const textWrap = document.createElement("div");
    textWrap.style.display = "flex";
    textWrap.style.flexDirection = "column";
    textWrap.style.gap = "2px";
    textWrap.style.minWidth = "0";

    const title = document.createElement("div");
    title.textContent = titleText;
    title.style.fontSize = "12px";
    title.style.fontWeight = "600";
    title.style.color = theme.text;

    const desc = document.createElement("div");
    desc.textContent = descriptionText;
    desc.style.fontSize = "10px";
    desc.style.color = theme.mutedText;
    desc.style.lineHeight = "1.3";

    textWrap.appendChild(title);
    textWrap.appendChild(desc);
    row.appendChild(textWrap);
    row.appendChild(control);
    return row;
  };

  const persist = (patch) => {
    if (storage) storage.set(patch);
  };

  const createCheckbox = (checked, onChange) => {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!checked;
    input.addEventListener("change", () => onChange(input.checked));
    return input;
  };

  const createNumberInput = (value, min, max, onChange) => {
    const input = document.createElement("input");
    input.type = "number";
    input.value = String(value);
    input.min = String(min);
    input.max = String(max);
    input.style.width = "96px";
    input.style.height = "30px";
    input.style.borderRadius = "8px";
    input.style.border = `1px solid ${theme.inputBorder}`;
    input.style.padding = "0 8px";
    input.style.fontSize = "12px";
    input.style.fontFamily = "inherit";
    input.style.background = theme.inputBg;
    input.style.color = theme.text;
    input.addEventListener("change", () => onChange(input));
    return input;
  };

  const createColorInput = (value, onChange) => {
    const input = document.createElement("input");
    input.type = "color";
    input.value = value;
    input.style.width = "44px";
    input.style.height = "30px";
    input.style.border = "none";
    input.style.background = "transparent";
    input.style.padding = "0";
    input.style.cursor = "pointer";
    input.addEventListener("input", () => onChange(input.value));
    input.addEventListener("change", () => onChange(input.value));
    return input;
  };

  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.checked = !!state.enabled;
  enabledInput.addEventListener("change", () => {
    state.enabled = enabledInput.checked;
    persist({ enabled: state.enabled });
    callbacks.applyUiSettings({});
    callbacks.scheduleVirtualization();
    callbacks.updateSearchVisibility(state.stats.totalMessages);
    callbacks.updateSidebarVisibility(state.stats.totalMessages);
  });

  const debugInput = document.createElement("input");
  debugInput.type = "checkbox";
  debugInput.checked = !!state.debug;
  debugInput.addEventListener("change", () => {
    state.debug = debugInput.checked;
    persist({ debug: state.debug });
  });

  const marginInput = createNumberInput(config.MARGIN_PX, config.MIN_MARGIN_PX, config.MAX_MARGIN_PX, (input) => {
    const next = helpers.normalizeMargin(input.value);
    input.value = String(next);
    config.MARGIN_PX = next;
    persist({ marginPx: next });
    callbacks.scheduleVirtualization();
  });

  const sidebarWidthInput = createNumberInput(
    uiSettings.sidebarWidthPx,
    constants.sidebarWidthMinPx,
    constants.sidebarWidthMaxPx,
    (input) => {
      const next = helpers.normalizeSidebarWidthPx(input.value, defaults.sidebarPanelWidthPx);
      input.value = String(next);
      callbacks.applyUiSettings({ sidebarWidthPx: next });
      persist({ sidebarWidthPx: next });
    }
  );

  const minimapVisibleInput = createCheckbox(uiSettings.minimapVisible, (checked) => {
    callbacks.applyUiSettings({ minimapVisible: checked });
    persist({ minimapVisible: checked });
  });

  const hotkeyInput = document.createElement("input");
  hotkeyInput.type = "text";
  hotkeyInput.value = uiSettings.sidebarHotkey;
  hotkeyInput.placeholder = "Alt+Shift+B";
  hotkeyInput.style.width = "120px";
  hotkeyInput.style.height = "30px";
  hotkeyInput.style.borderRadius = "8px";
  hotkeyInput.style.border = `1px solid ${theme.inputBorder}`;
  hotkeyInput.style.padding = "0 8px";
  hotkeyInput.style.fontSize = "12px";
  hotkeyInput.style.fontFamily = "inherit";
  hotkeyInput.style.background = theme.inputBg;
  hotkeyInput.style.color = theme.text;
  hotkeyInput.addEventListener("change", () => {
    const next = helpers.normalizeSidebarHotkey(hotkeyInput.value, defaults.sidebarHotkey);
    hotkeyInput.value = next;
    callbacks.applyUiSettings({ sidebarHotkey: next });
    persist({ sidebarHotkey: next });
  });

  const conversationPaddingInput = createNumberInput(
    uiSettings.conversationPaddingPx,
    constants.conversationPaddingMinPx,
    constants.conversationPaddingMaxPx,
    (input) => {
      const next = helpers.normalizeConversationPaddingPx(input.value, defaults.conversationPaddingPx);
      input.value = String(next);
      callbacks.applyUiSettings({ conversationPaddingPx: next });
      persist({ conversationPaddingPx: next });
    }
  );

  const composerWidthInput = createNumberInput(
    uiSettings.composerWidthPx,
    constants.composerWidthMinPx,
    constants.composerWidthMaxPx,
    (input) => {
      const next = helpers.normalizeComposerWidthPx(input.value, defaults.composerWidthPx);
      input.value = String(next);
      callbacks.applyUiSettings({ composerWidthPx: next });
      persist({ composerWidthPx: next });
    }
  );

  const scrollThrottleInput = createNumberInput(
    config.SCROLL_THROTTLE_MS,
    constants.scrollThrottleMinMs,
    constants.scrollThrottleMaxMs,
    (input) => {
      const next = helpers.normalizeScrollThrottleMs(input.value, config.SCROLL_THROTTLE_MS);
      input.value = String(next);
      config.SCROLL_THROTTLE_MS = next;
      persist({ scrollThrottleMs: next });
    }
  );

  const mutationDebounceInput = createNumberInput(
    config.MUTATION_DEBOUNCE_MS,
    constants.mutationDebounceMinMs,
    constants.mutationDebounceMaxMs,
    (input) => {
      const next = helpers.normalizeMutationDebounceMs(input.value, config.MUTATION_DEBOUNCE_MS);
      input.value = String(next);
      config.MUTATION_DEBOUNCE_MS = next;
      persist({ mutationDebounceMs: next });
    }
  );

  const colorUserDark = createColorInput(uiSettings.userColorDark, (value) => {
    const next = helpers.normalizeColorHex(value, defaults.roleColors.userDark);
    callbacks.applyUiSettings({ userColorDark: next });
    persist({ userColorDark: next });
  });
  const colorAssistantDark = createColorInput(uiSettings.assistantColorDark, (value) => {
    const next = helpers.normalizeColorHex(value, defaults.roleColors.assistantDark);
    callbacks.applyUiSettings({ assistantColorDark: next });
    persist({ assistantColorDark: next });
  });
  const colorUserLight = createColorInput(uiSettings.userColorLight, (value) => {
    const next = helpers.normalizeColorHex(value, defaults.roleColors.userLight);
    callbacks.applyUiSettings({ userColorLight: next });
    persist({ userColorLight: next });
  });
  const colorAssistantLight = createColorInput(uiSettings.assistantColorLight, (value) => {
    const next = helpers.normalizeColorHex(value, defaults.roleColors.assistantLight);
    callbacks.applyUiSettings({ assistantColorLight: next });
    persist({ assistantColorLight: next });
  });

  const resetColorsButton = document.createElement("button");
  resetColorsButton.type = "button";
  resetColorsButton.textContent = "Reset Colors";
  resetColorsButton.style.height = "30px";
  resetColorsButton.style.padding = "0 10px";
  resetColorsButton.style.borderRadius = "8px";
  resetColorsButton.style.border = `1px solid ${theme.panelBorder}`;
  resetColorsButton.style.background = theme.buttonMutedBg;
  resetColorsButton.style.color = theme.text;
  resetColorsButton.style.cursor = "pointer";
  resetColorsButton.style.fontSize = "11px";
  resetColorsButton.style.fontFamily = "inherit";
  resetColorsButton.addEventListener("click", () => {
    const colorPatch = {
      userColorDark: defaults.roleColors.userDark,
      assistantColorDark: defaults.roleColors.assistantDark,
      userColorLight: defaults.roleColors.userLight,
      assistantColorLight: defaults.roleColors.assistantLight
    };
    callbacks.applyUiSettings(colorPatch);
    persist(colorPatch);
    callbacks.rerenderSettings();
  });

  controlList.appendChild(sectionTitle("Behavior"));
  controlList.appendChild(settingRow("Enable Virtual Scrolling", "Toggle virtualization and GPT Boost UI.", enabledInput));
  controlList.appendChild(settingRow("Debug Mode", "Show GPT Boost debug logs in DevTools.", debugInput));

  controlList.appendChild(sectionTitle("Virtualization"));
  controlList.appendChild(settingRow("Virtualization Margin", "Buffer around viewport (px).", marginInput));
  controlList.appendChild(settingRow("Scroll Throttle", "Scroll update throttle in ms.", scrollThrottleInput));
  controlList.appendChild(settingRow("Mutation Debounce", "DOM observer debounce in ms.", mutationDebounceInput));

  controlList.appendChild(sectionTitle("Layout"));
  controlList.appendChild(settingRow("Sidebar Width", "Default sidebar width (px).", sidebarWidthInput));
  controlList.appendChild(settingRow("Show Minimap", "Toggle minimap visibility.", minimapVisibleInput));
  controlList.appendChild(settingRow("Sidebar Hotkey", "Toggle tools sidebar from keyboard.", hotkeyInput));
  controlList.appendChild(
    settingRow(
      "Conversation Padding",
      "Controls page-side padding for thread content (px).",
      conversationPaddingInput
    )
  );
  controlList.appendChild(
    settingRow(
      "Composer Width",
      "Controls the ChatGPT composer/content width (px).",
      composerWidthInput
    )
  );

  controlList.appendChild(sectionTitle("Colors"));
  const userDarkShell = createInputShell();
  userDarkShell.appendChild(colorUserDark);
  controlList.appendChild(settingRow("User (Dark)", "User bubble color in dark mode.", userDarkShell));
  const agentDarkShell = createInputShell();
  agentDarkShell.appendChild(colorAssistantDark);
  controlList.appendChild(settingRow("Agent (Dark)", "Agent bubble color in dark mode.", agentDarkShell));
  const userLightShell = createInputShell();
  userLightShell.appendChild(colorUserLight);
  controlList.appendChild(settingRow("User (Light)", "User bubble color in light mode.", userLightShell));
  const agentLightShell = createInputShell();
  agentLightShell.appendChild(colorAssistantLight);
  controlList.appendChild(settingRow("Agent (Light)", "Agent bubble color in light mode.", agentLightShell));
  const resetShell = createInputShell();
  resetShell.appendChild(resetColorsButton);
  controlList.appendChild(settingRow("Defaults", "Reset all role colors to extension defaults.", resetShell));

  controlList.appendChild(sectionTitle("Status"));
  const statsSnapshot = callbacks.getStatsSnapshot();
  const statsGrid = document.createElement("div");
  statsGrid.style.display = "grid";
  statsGrid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  statsGrid.style.gap = "8px";
  statsGrid.style.marginBottom = "6px";

  const mkStat = (label, value) => {
    const card = document.createElement("div");
    card.style.border = `1px solid ${theme.panelBorder}`;
    card.style.borderRadius = "8px";
    card.style.padding = "8px";
    card.style.background = theme.inputBg;
    const l = document.createElement("div");
    l.textContent = label;
    l.style.fontSize = "10px";
    l.style.letterSpacing = "0.08em";
    l.style.textTransform = "uppercase";
    l.style.color = theme.mutedText;
    const v = document.createElement("div");
    v.textContent = value;
    v.style.marginTop = "4px";
    v.style.fontSize = "14px";
    v.style.fontWeight = "600";
    v.style.color = theme.text;
    card.appendChild(l);
    card.appendChild(v);
    return card;
  };

  statsGrid.appendChild(mkStat("Total Messages", String(statsSnapshot.totalMessages)));
  statsGrid.appendChild(mkStat("Rendered", String(statsSnapshot.renderedMessages)));
  statsGrid.appendChild(mkStat("Memory Saved", `${statsSnapshot.memorySavedPercent}%`));
  statsGrid.appendChild(mkStat("Status", state.enabled ? "Active" : "Disabled"));
  controlList.appendChild(statsGrid);

  controlList.appendChild(sectionTitle("Cached Conversations"));
  const cacheDetails = document.createElement("pre");
  cacheDetails.style.margin = "0";
  cacheDetails.style.padding = "8px";
  cacheDetails.style.fontSize = "10px";
  cacheDetails.style.lineHeight = "1.35";
  cacheDetails.style.whiteSpace = "pre-wrap";
  cacheDetails.style.wordBreak = "break-word";
  cacheDetails.style.maxHeight = "180px";
  cacheDetails.style.overflow = "auto";
  cacheDetails.style.borderRadius = "8px";
  cacheDetails.style.border = `1px solid ${theme.panelBorder}`;
  cacheDetails.style.background = theme.inputBg;
  cacheDetails.style.color = theme.text;
  cacheDetails.textContent = "Loading cached conversation data...";
  controlList.appendChild(cacheDetails);

  Promise.all([callbacks.loadFlagsStore(), callbacks.loadKnownConversationsStore()]).then(([flagsStore, knownStore]) => {
    const summary = callbacks.summarizeConversationCaches(flagsStore, knownStore);
    const flagKeys = Object.keys(flagsStore || {});
    const knownKeys = Object.keys(knownStore || {});
    const payload = {
      totalCachedConversations: summary.totalKnownConversations,
      totalFlaggedConversations: summary.totalFlaggedConversations,
      currentConversationKey: callbacks.currentConversationKey || "(none)",
      cachedPinnedMessages: summary.cachedPinnedMessages,
      cachedBookmarkedMessages: summary.cachedBookmarkedMessages,
      approxFlagsBytes: summary.approxFlagsBytes,
      approxKnownBytes: summary.approxKnownBytes,
      flaggedConversations: flagKeys.slice(0, 10).map((key) => ({
        key,
        pinned: Array.isArray(flagsStore[key]?.pinned) ? flagsStore[key].pinned.length : 0,
        bookmarked: Array.isArray(flagsStore[key]?.bookmarked) ? flagsStore[key].bookmarked.length : 0
      })),
      knownConversations: knownKeys.slice(0, 10).map((key) => ({
        key,
        visits: Number(knownStore[key]?.visits || 0),
        lastSeenAt: knownStore[key]?.lastSeenAt || ""
      }))
    };
    cacheDetails.textContent = JSON.stringify(payload, null, 2);
  }).catch(() => {
    cacheDetails.textContent = "Cached conversation stats unavailable.";
  });
}
