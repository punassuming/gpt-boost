import { createSvgIcon } from '../../shell/icons.js';

export function createSidebarShellFeature({
  refs,
  constants,
  deps
}) {
  let headerDetailsLabel = null;
  let footerVersionLabel = null;
  const TAB_META = [
    { id: "memory", label: "Memory", icon: "memory" },
    { id: "search", label: "Search", icon: "search" },
    { id: "marks", label: "Marks", icon: "marks" },
    { id: "inspector", label: "Inspect", icon: "inspector" },
    { id: "snippets", label: "Code", icon: "code" },
    { id: "settings", label: "Settings", icon: "settings" }
  ];

  function getTabMeta(tabId) {
    return TAB_META.find((entry) => entry.id === tabId) || TAB_META[0];
  }

  function applySidebarTheme(theme) {
    if (!(refs.sidebarPanel instanceof HTMLElement)) return;
    const header = refs.sidebarPanel.querySelector('[data-gpt-boost-sidebar-header="1"]');
    const context = refs.sidebarPanel.querySelector('[data-gpt-boost-sidebar-context="1"]');
    const nav = refs.sidebarPanel.querySelector('[data-gpt-boost-sidebar-nav="1"]');
    const footer = refs.sidebarPanel.querySelector('[data-gpt-boost-sidebar-footer="1"]');

    if (header instanceof HTMLElement) {
      header.style.background = `linear-gradient(145deg, ${theme.inputBg}, ${theme.panelBg})`;
      header.style.border = `1px solid ${theme.panelBorder}`;
      header.style.boxShadow = theme.panelShadow;
    }
    if (context instanceof HTMLElement) {
      context.style.background = theme.buttonMutedBg;
      context.style.border = `1px solid ${theme.panelBorder}`;
      context.style.color = theme.text;
    }
    if (nav instanceof HTMLElement) {
      nav.style.background = theme.inputBg;
      nav.style.border = `1px solid ${theme.panelBorder}`;
    }
    if (footer instanceof HTMLElement) {
      footer.style.borderTop = `1px solid ${theme.panelBorder}`;
      footer.style.color = theme.mutedText;
    }
  }

  function isSidebarOpen() {
    return !!(refs.sidebarPanel && refs.sidebarPanel.getAttribute("data-open") === "true");
  }

  function createSidebarTabButton(tabId, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.style.border = "1px solid transparent";
    btn.style.borderRadius = "12px";
    btn.style.padding = "10px 8px";
    btn.style.width = "100%";
    btn.style.minWidth = "0";
    btn.style.minHeight = "58px";
    btn.style.fontSize = "11px";
    btn.style.cursor = "pointer";
    btn.style.fontFamily = "inherit";
    btn.style.fontWeight = "600";
    btn.style.display = "inline-flex";
    btn.style.flexDirection = "column";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.gap = "6px";
    btn.style.lineHeight = "1.1";
    btn.style.background = "transparent";
    btn.style.color = "inherit";
    btn.style.transition = "background 0.15s ease, color 0.15s ease, border-color 0.15s ease";
    btn.style.boxSizing = "border-box";
    btn.dataset.gptBoostSidebarTab = tabId;
    btn.dataset.gptBoostSidebarActive = "0";

    const iconName = TAB_META.find((entry) => entry.id === tabId)?.icon || "settings";
    const iconEl = createSvgIcon(iconName, 15);
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    labelEl.style.display = "block";
    labelEl.style.fontSize = "11px";
    labelEl.style.fontWeight = "600";
    btn.appendChild(iconEl);
    btn.appendChild(labelEl);
    btn.addEventListener("mouseenter", () => {
      if (btn.dataset.gptBoostSidebarActive === "1") return;
      const theme = deps.getThemeTokens();
      btn.style.background = theme.buttonMutedBg;
      btn.style.color = theme.text;
      btn.style.borderColor = theme.panelBorder;
    });
    btn.addEventListener("mouseleave", () => {
      if (btn.dataset.gptBoostSidebarActive === "1") return;
      const theme = deps.getThemeTokens();
      btn.style.background = "transparent";
      btn.style.color = theme.mutedText;
      btn.style.borderColor = "transparent";
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
    const context = refs.sidebarPanel instanceof HTMLElement
      ? refs.sidebarPanel.querySelector('[data-gpt-boost-sidebar-context="1"]')
      : null;
    if (context instanceof HTMLElement) {
      context.textContent = getTabMeta(refs.activeSidebarTab).label;
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
      tab.style.borderColor = isActive ? theme.panelBorder : "transparent";
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
    button.appendChild(createSvgIcon("panelRight", 16));
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
    header.setAttribute("data-gpt-boost-sidebar-header", "1");
    header.style.display = "flex";
    header.style.flexDirection = "column";
    header.style.alignItems = "stretch";
    header.style.justifyContent = "space-between";
    header.style.gap = "10px";
    header.style.marginBottom = "10px";
    header.style.padding = "12px";
    header.style.borderRadius = "18px";
    header.style.border = `1px solid ${theme.panelBorder}`;

    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.alignItems = "flex-start";
    topRow.style.justifyContent = "space-between";
    topRow.style.gap = "10px";

    const titleWrap = document.createElement("div");
    titleWrap.style.display = "flex";
    titleWrap.style.flexDirection = "column";
    titleWrap.style.gap = "4px";
    titleWrap.style.minWidth = "0";

    const eyebrow = document.createElement("div");
    eyebrow.textContent = "Workspace";
    eyebrow.style.fontSize = "10px";
    eyebrow.style.letterSpacing = "0.14em";
    eyebrow.style.textTransform = "uppercase";
    eyebrow.style.color = theme.mutedText;

    const title = document.createElement("div");
    title.textContent = "GPT Boost Workspace";
    title.style.fontSize = "14px";
    title.style.fontWeight = "700";
    title.style.letterSpacing = "0.01em";
    title.style.lineHeight = "1.1";

    const details = document.createElement("div");
    details.style.fontSize = "11px";
    details.style.lineHeight = "1.2";
    details.style.color = theme.mutedText;
    details.style.opacity = "0.82";
    details.textContent = deps.getSidebarStatsSummary();
    headerDetailsLabel = details;
    titleWrap.appendChild(eyebrow);
    titleWrap.appendChild(title);
    titleWrap.appendChild(details);

    const headerActions = document.createElement("div");
    headerActions.style.display = "flex";
    headerActions.style.alignItems = "center";
    headerActions.style.gap = "4px";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close sidebar");
    deps.styleSearchButton(closeBtn, 28);
    closeBtn.style.display = "flex";
    closeBtn.style.background = "transparent";
    closeBtn.style.color = theme.mutedText;
    closeBtn.style.border = "none";
    closeBtn.style.borderRadius = "6px";
    closeBtn.appendChild(createSvgIcon("close", 15));
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = theme.buttonMutedBg; closeBtn.style.color = theme.text; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = "transparent"; closeBtn.style.color = theme.mutedText; });
    closeBtn.addEventListener("click", hideSidebar);

    headerActions.appendChild(closeBtn);
    topRow.appendChild(titleWrap);
    topRow.appendChild(headerActions);

    const metaRow = document.createElement("div");
    metaRow.style.display = "flex";
    metaRow.style.alignItems = "center";
    metaRow.style.justifyContent = "space-between";
    metaRow.style.gap = "8px";

    const context = document.createElement("div");
    context.setAttribute("data-gpt-boost-sidebar-context", "1");
    context.style.display = "inline-flex";
    context.style.alignItems = "center";
    context.style.width = "fit-content";
    context.style.padding = "4px 8px";
    context.style.borderRadius = "999px";
    context.style.fontSize = "10px";
    context.style.fontWeight = "700";
    context.style.letterSpacing = "0.06em";
    context.style.textTransform = "uppercase";
    context.textContent = getTabMeta(refs.activeSidebarTab).label;

    const metaHint = document.createElement("div");
    metaHint.textContent = "Integrated tools for reading, searching, and saving";
    metaHint.style.fontSize = "10px";
    metaHint.style.opacity = "0.74";
    metaHint.style.color = theme.mutedText;
    metaHint.style.textAlign = "right";

    metaRow.appendChild(context);
    metaRow.appendChild(metaHint);

    header.appendChild(topRow);
    header.appendChild(metaRow);

    const tabs = document.createElement("div");
    tabs.setAttribute("data-gpt-boost-sidebar-nav", "1");
    tabs.style.display = "grid";
    tabs.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
    tabs.style.gap = "6px";
    tabs.style.marginBottom = "10px";
    tabs.style.padding = "4px";
    tabs.style.borderRadius = "14px";
    tabs.style.background = theme.inputBg;
    tabs.style.border = `1px solid ${theme.panelBorder}`;
    TAB_META.forEach((entry) => {
      tabs.appendChild(createSidebarTabButton(entry.id, entry.label));
    });

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "10px";
    content.style.flex = "1";
    content.style.minHeight = "0";
    content.style.overflow = "hidden";

    const footer = document.createElement("div");
    footer.setAttribute("data-gpt-boost-sidebar-footer", "1");
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
    applySidebarTheme(theme);
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
    refreshSidebarMeta,
    applyTheme: applySidebarTheme
  };
}
