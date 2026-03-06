export function createSidebarShellFeature({
  refs,
  constants,
  deps
}) {
  const ns = "http://www.w3.org/2000/svg";
  let headerDetailsLabel = null;
  let footerVersionLabel = null;

  function makeSvgIcon(specs, size = 14) {
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.style.fill = "none";
    svg.style.stroke = "currentColor";
    svg.style.strokeWidth = "2";
    svg.style.strokeLinecap = "round";
    svg.style.strokeLinejoin = "round";
    svg.style.display = "block";
    svg.style.flexShrink = "0";
    const specList = Array.isArray(specs) ? specs : [{ tag: "path", d: specs }];
    specList.forEach((spec) => {
      const el = document.createElementNS(ns, spec.tag);
      Object.entries(spec).forEach(([k, v]) => { if (k !== "tag") el.setAttribute(k, v); });
      svg.appendChild(el);
    });
    return svg;
  }

  const TAB_ICONS = {
    search: [
      { tag: "circle", cx: "11", cy: "11", r: "8" },
      { tag: "path", d: "m21 21-4.35-4.35" }
    ],
    bookmarks: { tag: "path", d: "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" },
    snippets: [
      { tag: "path", d: "m18 16 4-4-4-4" },
      { tag: "path", d: "m6 8-4 4 4 4" },
      { tag: "path", d: "m14.5 4-5 16" }
    ],
    map: { tag: "path", d: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
    outline: { tag: "path", d: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
    settings: [
      { tag: "path", d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" },
      { tag: "circle", cx: "12", cy: "12", r: "3" }
    ]
  };

  const CLOSE_ICON = [
    { tag: "path", d: "M18 6 6 18" },
    { tag: "path", d: "m6 6 12 12" }
  ];

  const PANEL_RIGHT_ICON = [
    { tag: "rect", width: "18", height: "18", x: "3", y: "3", rx: "2" },
    { tag: "path", d: "M15 3v18" }
  ];

  function isSidebarOpen() {
    return !!(refs.sidebarPanel && refs.sidebarPanel.getAttribute("data-open") === "true");
  }

  function createSidebarTabButton(tabId, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.padding = "6px 0";
    btn.style.width = "auto";
    btn.style.flex = "1 1 0";
    btn.style.minWidth = "0";
    btn.style.height = "30px";
    btn.style.fontSize = "11px";
    btn.style.cursor = "pointer";
    btn.style.fontFamily = "inherit";
    btn.style.fontWeight = "500";
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.lineHeight = "1";
    btn.style.background = "transparent";
    btn.style.color = "inherit";
    btn.style.transition = "background 0.15s ease, color 0.15s ease";
    btn.style.flexShrink = "0";
    btn.dataset.gptBoostSidebarTab = tabId;
    btn.dataset.gptBoostSidebarActive = "0";

    const iconEl = makeSvgIcon(TAB_ICONS[tabId] || TAB_ICONS.settings, 13);
    btn.appendChild(iconEl);
    btn.addEventListener("mouseenter", () => {
      if (btn.dataset.gptBoostSidebarActive === "1") return;
      const theme = deps.getThemeTokens();
      btn.style.background = theme.buttonMutedBg;
      btn.style.color = theme.text;
    });
    btn.addEventListener("mouseleave", () => {
      if (btn.dataset.gptBoostSidebarActive === "1") return;
      const theme = deps.getThemeTokens();
      btn.style.background = "transparent";
      btn.style.color = theme.mutedText;
    });
    btn.addEventListener("click", () => {
      if (isSidebarOpen()) {
        renderSidebarTab(tabId);
      } else {
        openSidebar(tabId);
      }
    });
    return btn;
  }

  function refreshSidebarMeta() {
    if (headerDetailsLabel) {
      if (!headerDetailsLabel.isConnected) {
        headerDetailsLabel = null;
      } else {
        headerDetailsLabel.textContent = deps.getSidebarStatsSummary();
      }
    }
    if (footerVersionLabel) {
      if (!footerVersionLabel.isConnected) {
        footerVersionLabel = null;
      } else {
        footerVersionLabel.textContent = deps.getSidebarVersionLabel();
      }
    }
  }

  function renderSidebarTab(tabId) {
    if (!refs.sidebarContentContainer) return;
    refs.activeSidebarTab = tabId;
    refs.sidebarContentContainer.innerHTML = "";
    const theme = deps.getThemeTokens();

    const tabs = refs.sidebarPanel ? refs.sidebarPanel.querySelectorAll("[data-gpt-boost-sidebar-tab]") : [];
    tabs.forEach((tab) => {
      if (!(tab instanceof HTMLElement)) return;
      const isActive = tab.dataset.gptBoostSidebarTab === tabId;
      tab.dataset.gptBoostSidebarActive = isActive ? "1" : "0";
      tab.style.opacity = "1";
      tab.style.background = isActive ? theme.buttonMutedBg : "transparent";
      tab.style.color = isActive ? theme.text : theme.mutedText;
      tab.style.fontWeight = isActive ? "600" : "500";
      tab.style.boxShadow = "none";
    });

    deps.renderSidebarTabContent(tabId, refs.sidebarContentContainer);
    if (tabId === "map") {
      deps.onMapTabActivated();
    }
    refreshSidebarMeta();
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
    if (!wasOpen) {
      panel.style.transition = "none";
      panel.style.transform = "translateX(100%)";
      void panel.offsetWidth;
      panel.style.transition = `transform ${constants.sidebarTransitionMs}ms ease`;
      requestAnimationFrame(() => {
        if (!panel.isConnected) return;
        panel.style.transform = "translateX(0px)";
      });
    } else {
      panel.style.transform = "translateX(0px)";
    }
    deps.applyFloatingUiOffsets();
    if (!wasOpen) deps.refreshArticleSideRailLayout();
    renderSidebarTab(tabId || refs.activeSidebarTab);
    refreshSidebarMeta();
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
    button.appendChild(makeSvgIcon(PANEL_RIGHT_ICON, 16));
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
    header.style.alignItems = "flex-start";
    header.style.justifyContent = "space-between";
    header.style.gap = "8px";
    header.style.marginBottom = "6px";
    header.style.padding = "4px 2px 8px";
    header.style.borderBottom = `1px solid ${theme.panelBorder}`;

    const titleWrap = document.createElement("div");
    titleWrap.style.display = "flex";
    titleWrap.style.flexDirection = "column";
    titleWrap.style.gap = "3px";
    titleWrap.style.minWidth = "0";

    const title = document.createElement("div");
    title.textContent = "GPT Boost";
    title.style.fontSize = "13px";
    title.style.fontWeight = "600";
    title.style.letterSpacing = "0.01em";
    title.style.lineHeight = "1.1";

    const details = document.createElement("div");
    details.style.fontSize = "10px";
    details.style.lineHeight = "1.2";
    details.style.color = theme.mutedText;
    details.style.opacity = "0.82";
    details.textContent = deps.getSidebarStatsSummary();
    headerDetailsLabel = details;
    titleWrap.appendChild(title);
    titleWrap.appendChild(details);

    const headerActions = document.createElement("div");
    headerActions.style.display = "flex";
    headerActions.style.alignItems = "center";
    headerActions.style.gap = "4px";

    const settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.setAttribute("aria-label", "Open sidebar settings");
    deps.styleSearchButton(settingsBtn, 28);
    settingsBtn.style.display = "flex";
    settingsBtn.style.background = "transparent";
    settingsBtn.style.color = theme.mutedText;
    settingsBtn.style.border = "none";
    settingsBtn.style.borderRadius = "6px";
    settingsBtn.appendChild(makeSvgIcon(TAB_ICONS.settings, 15));
    settingsBtn.addEventListener("mouseenter", () => { settingsBtn.style.background = theme.buttonMutedBg; settingsBtn.style.color = theme.text; });
    settingsBtn.addEventListener("mouseleave", () => { settingsBtn.style.background = "transparent"; settingsBtn.style.color = theme.mutedText; });
    settingsBtn.addEventListener("click", () => {
      if (isSidebarOpen()) {
        renderSidebarTab("settings");
      } else {
        openSidebar("settings");
      }
    });

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close sidebar");
    deps.styleSearchButton(closeBtn, 28);
    closeBtn.style.display = "flex";
    closeBtn.style.background = "transparent";
    closeBtn.style.color = theme.mutedText;
    closeBtn.style.border = "none";
    closeBtn.style.borderRadius = "6px";
    closeBtn.appendChild(makeSvgIcon(CLOSE_ICON, 15));
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = theme.buttonMutedBg; closeBtn.style.color = theme.text; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = "transparent"; closeBtn.style.color = theme.mutedText; });
    closeBtn.addEventListener("click", hideSidebar);

    headerActions.appendChild(settingsBtn);
    headerActions.appendChild(closeBtn);
    header.appendChild(titleWrap);
    header.appendChild(headerActions);

    const tabs = document.createElement("div");
    tabs.style.display = "flex";
    tabs.style.flexWrap = "nowrap";
    tabs.style.gap = "4px";
    tabs.style.marginBottom = "8px";
    tabs.style.padding = "3px";
    tabs.style.borderRadius = "10px";
    tabs.style.background = theme.inputBg;
    tabs.style.border = `1px solid ${theme.panelBorder}`;
    tabs.style.overflowX = "hidden";
    tabs.style.alignItems = "center";

    tabs.appendChild(createSidebarTabButton("search", "Search"));
    tabs.appendChild(createSidebarTabButton("bookmarks", "Marks"));
    tabs.appendChild(createSidebarTabButton("snippets", "Code"));

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "8px";
    content.style.flex = "1";
    content.style.minHeight = "0";
    content.style.overflow = "hidden";

    const footer = document.createElement("div");
    footer.style.marginTop = "8px";
    footer.style.padding = "8px 2px 2px";
    footer.style.borderTop = `1px solid ${theme.panelBorder}`;
    footer.style.fontSize = "10px";
    footer.style.lineHeight = "1.2";
    footer.style.color = theme.mutedText;
    footer.style.opacity = "0.78";
    footer.textContent = deps.getSidebarVersionLabel();
    footerVersionLabel = footer;

    panel.appendChild(header);
    panel.appendChild(tabs);
    panel.appendChild(content);
    panel.appendChild(footer);
    document.body.appendChild(panel);
    refs.sidebarPanel = panel;
    refs.sidebarContentContainer = content;
    refreshSidebarMeta();
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
    updateSidebarVisibility,
    refreshSidebarMeta
  };
}
