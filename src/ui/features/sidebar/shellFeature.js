export function createSidebarShellFeature({
  refs,
  constants,
  deps
}) {
  function isSidebarOpen() {
    return !!(refs.sidebarPanel && refs.sidebarPanel.getAttribute("data-open") === "true");
  }

  function createSidebarTabButton(tabId, label, icon) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `${icon} ${label}`;
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.padding = "6px 8px";
    btn.style.fontSize = "11px";
    btn.style.cursor = "pointer";
    btn.style.fontFamily = "inherit";
    btn.style.background = "transparent";
    btn.style.color = "inherit";
    btn.dataset.gptBoostSidebarTab = tabId;
    btn.addEventListener("click", () => {
      if (isSidebarOpen()) {
        renderSidebarTab(tabId);
      } else {
        openSidebar(tabId);
      }
    });
    return btn;
  }

  function renderSidebarTab(tabId) {
    if (!refs.sidebarContentContainer) return;
    refs.activeSidebarTab = tabId;
    refs.sidebarContentContainer.innerHTML = "";

    const tabs = refs.sidebarPanel ? refs.sidebarPanel.querySelectorAll("[data-gpt-boost-sidebar-tab]") : [];
    tabs.forEach((tab) => {
      if (!(tab instanceof HTMLElement)) return;
      const isActive = tab.dataset.gptBoostSidebarTab === tabId;
      tab.style.opacity = isActive ? "1" : "0.72";
      tab.style.background = "transparent";
      tab.style.borderRadius = "0";
      tab.style.padding = "4px 0";
      tab.style.borderBottom = isActive
        ? `2px solid ${deps.getThemeTokens().text}`
        : "2px solid transparent";
    });

    deps.renderSidebarTabContent(tabId, refs.sidebarContentContainer);
    if (tabId === "map") {
      deps.onMapTabActivated();
    }
  }

  function hideSidebar() {
    if (refs.sidebarPanel) {
      refs.sidebarPanel.setAttribute("data-open", "false");
      refs.sidebarPanel.style.transform = "translateX(100%)";
    }
    deps.applySidebarLayoutOffset(0);
    deps.applyFloatingUiOffsets();
    deps.refreshArticleSideRailLayout();
    deps.clearSearchHighlight();
  }

  function openSidebar(tabId) {
    const panel = ensureSidebarPanel();
    if (!panel) return;
    const wasOpen = panel.getAttribute("data-open") === "true";
    deps.hideSearchPanel();
    if (!wasOpen) {
      deps.applySidebarLayoutOffset(refs.currentSidebarWidthPx);
    }
    panel.setAttribute("data-open", "true");
    panel.style.transform = "translateX(0px)";
    deps.applyFloatingUiOffsets();
    if (!wasOpen) deps.refreshArticleSideRailLayout();
    renderSidebarTab(tabId || refs.activeSidebarTab);
    deps.applyThemeToUi();
  }

  function toggleSidebar(tabId) {
    const panel = ensureSidebarPanel();
    if (!panel) return;
    const requested = tabId || refs.activeSidebarTab;
    if (isSidebarOpen() && requested === refs.activeSidebarTab) {
      hideSidebar();
      return;
    }
    openSidebar(requested);
  }

  function bindSidebarHotkey() {
    if (refs.hotkeyListenerBound) return;
    window.addEventListener("keydown", (event) => {
      if (!deps.isEnabled()) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      if (!deps.hotkeyMatchesKeyboardEvent(deps.getSidebarHotkey(), event)) return;
      event.preventDefault();
      toggleSidebar(refs.activeSidebarTab || "search");
    });
    refs.hotkeyListenerBound = true;
  }

  function ensureSidebarToggleButton() {
    if (refs.sidebarToggleButton && refs.sidebarToggleButton.isConnected) return refs.sidebarToggleButton;
    if (!document.body) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Open tools sidebar");
    button.style.position = "fixed";
    button.style.right = `${constants.sidebarToggleRightOffsetPx}px`;
    button.style.top = `${constants.sidebarToggleTopOffsetPx}px`;
    button.style.zIndex = "10002";
    button.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";
    deps.styleSearchButton(button, constants.sidebarToggleSizePx);
    button.style.display = "none";
    button.textContent = "☰";
    button.addEventListener("click", () => toggleSidebar(refs.activeSidebarTab));

    document.body.appendChild(button);
    refs.sidebarToggleButton = button;
    deps.applyFloatingUiOffsets();
    return button;
  }

  function ensureSidebarPanel() {
    if (refs.sidebarPanel && refs.sidebarPanel.isConnected) return refs.sidebarPanel;
    if (!document.body) return null;
    const theme = deps.getThemeTokens();

    const panel = document.createElement("div");
    panel.setAttribute("data-gpt-boost-sidebar", "panel");
    panel.setAttribute("data-open", "false");
    panel.style.position = "fixed";
    panel.style.top = "0";
    panel.style.right = "0";
    panel.style.bottom = "0";
    panel.style.zIndex = "10000";
    panel.style.width = `${refs.currentSidebarWidthPx}px`;
    panel.style.display = "flex";
    panel.style.transform = "translateX(100%)";
    panel.style.transition = `transform ${constants.sidebarTransitionMs}ms ease`;
    panel.style.flexDirection = "column";
    panel.style.gap = "0";
    panel.style.padding = "12px";
    panel.style.background = theme.panelBg;
    panel.style.boxShadow = "none";
    panel.style.borderLeft = `1px solid ${theme.panelBorder}`;
    panel.style.color = theme.text;
    panel.style.backdropFilter = "";
    panel.style.boxSizing = "border-box";
    panel.style.overflow = "hidden";

    const resizer = document.createElement("div");
    resizer.style.position = "absolute";
    resizer.style.left = "0";
    resizer.style.top = "0";
    resizer.style.bottom = "0";
    resizer.style.width = "4px";
    resizer.style.cursor = "ew-resize";
    resizer.style.zIndex = "10";
    resizer.style.background = "transparent";

    let isResizing = false;
    resizer.addEventListener("mousedown", () => {
      isResizing = true;
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > constants.minSidebarWidthPx && newWidth < window.innerWidth - constants.minViewportGapPx) {
        refs.currentSidebarWidthPx = newWidth;
        panel.style.width = `${refs.currentSidebarWidthPx}px`;
        if (isSidebarOpen()) {
          deps.applySidebarLayoutOffset(refs.currentSidebarWidthPx, 0);
          deps.applyFloatingUiOffsets();
        }
      }
    });

    window.addEventListener("mouseup", () => {
      if (!isResizing) return;
      isResizing = false;
      document.body.style.userSelect = "";
    });

    panel.appendChild(resizer);

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.flexDirection = "column";
    header.style.gap = "6px";
    header.style.marginBottom = "16px";

    const headingRow = document.createElement("div");
    headingRow.style.display = "flex";
    headingRow.style.alignItems = "center";
    headingRow.style.justifyContent = "space-between";
    headingRow.style.gap = "10px";

    const headingCopy = document.createElement("div");
    headingCopy.style.display = "flex";
    headingCopy.style.flexDirection = "column";
    headingCopy.style.gap = "1px";

    const title = document.createElement("div");
    title.textContent = "GPT Boost";
    title.style.fontSize = "14px";
    title.style.fontWeight = "600";
    title.style.letterSpacing = "0.02em";
    title.style.opacity = "0.95";

    const tag = document.createElement("div");
    tag.textContent = "Productivity / Speed / Virtualization";
    tag.style.fontSize = "10px";
    tag.style.opacity = "0.72";

    const headerActions = document.createElement("div");
    headerActions.style.display = "flex";
    headerActions.style.alignItems = "center";
    headerActions.style.gap = "6px";

    const settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.textContent = "⚙";
    settingsBtn.setAttribute("aria-label", "Open sidebar settings");
    deps.styleSearchButton(settingsBtn, 24);
    settingsBtn.style.display = "flex";
    settingsBtn.style.background = "rgba(148, 163, 184, 0.2)";
    settingsBtn.addEventListener("click", () => {
      if (isSidebarOpen()) {
        renderSidebarTab("settings");
      } else {
        openSidebar("settings");
      }
    });

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close sidebar");
    deps.styleSearchButton(closeBtn, 24);
    closeBtn.style.display = "flex";
    closeBtn.style.background = "rgba(148, 163, 184, 0.2)";
    closeBtn.addEventListener("click", hideSidebar);

    headerActions.appendChild(settingsBtn);
    headerActions.appendChild(closeBtn);
    headingCopy.appendChild(title);
    headingCopy.appendChild(tag);
    headingRow.appendChild(headingCopy);
    headingRow.appendChild(headerActions);

    const subtitle = document.createElement("div");
    subtitle.textContent = "Intelligent message virtualization that keeps long chats fast and focused.";
    subtitle.style.fontSize = "11px";
    subtitle.style.lineHeight = "1.35";
    subtitle.style.opacity = "0.76";

    header.appendChild(headingRow);
    header.appendChild(subtitle);

    const tabs = document.createElement("div");
    tabs.style.display = "flex";
    tabs.style.gap = "8px";
    tabs.style.marginBottom = "12px";
    tabs.style.paddingBottom = "6px";
    tabs.style.borderBottom = `1px solid ${theme.panelBorder}`;

    tabs.appendChild(createSidebarTabButton("search", "Search", "🔎"));
    tabs.appendChild(createSidebarTabButton("bookmarks", "Marks", "🔖"));
    tabs.appendChild(createSidebarTabButton("snippets", "Code", "⌨"));
    tabs.appendChild(createSidebarTabButton("outline", "Outline", "🧭"));
    tabs.appendChild(createSidebarTabButton("settings", "Settings", "⚙"));

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "8px";
    content.style.flex = "1";
    content.style.minHeight = "0";
    content.style.overflow = "hidden";

    panel.appendChild(header);
    panel.appendChild(tabs);
    panel.appendChild(content);
    document.body.appendChild(panel);
    refs.sidebarPanel = panel;
    refs.sidebarContentContainer = content;
    deps.applyFloatingUiOffsets();
    return panel;
  }

  function updateSidebarVisibility() {
    const shouldShow = deps.isEnabled();
    const button = ensureSidebarToggleButton();
    if (!button) return;
    button.style.display = shouldShow ? "flex" : "none";
    if (!shouldShow) hideSidebar();
  }

  return {
    isSidebarOpen,
    createSidebarTabButton,
    renderSidebarTab,
    hideSidebar,
    openSidebar,
    toggleSidebar,
    bindSidebarHotkey,
    ensureSidebarToggleButton,
    ensureSidebarPanel,
    updateSidebarVisibility
  };
}
