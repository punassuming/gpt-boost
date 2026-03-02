import {
  clampRatio,
  computeScrollTopFromRatio,
  computeViewportThumbLayout
} from './minimapMath.js';
import {
  buildMinimapItems as buildItems,
  computeMarkerGeometry
} from './minimapModel.js';

export function createMinimapFeature({
  refs,
  state,
  constants,
  getUiSettings,
  deps
}) {
  function hideMinimapPanel() {
    if (refs.minimapPanel) refs.minimapPanel.style.display = "none";
    refs.activeStandaloneMinimapVirtualId = null;
  }

  function hideMinimapUi() {
    if (refs.minimapButton) refs.minimapButton.style.display = "none";
    hideMinimapPanel();
  }

  function buildMinimapItems() {
    return buildItems({
      ensureVirtualIds: deps.ensureVirtualIds,
      articleMap: state.articleMap,
      getMessageRole: deps.getMessageRole
    });
  }

  function scrollToMinimapItem(virtualId) {
    deps.scrollToVirtualId(virtualId);
  }

  function scrollToMinimapRatio(ratio, behavior = "auto") {
    const scrollTarget = deps.getScrollTarget();
    if (!scrollTarget) return;
    const maxScrollTop = deps.getMaxScrollTop(scrollTarget);
    const targetTop = computeScrollTopFromRatio(ratio, maxScrollTop);
    scrollTarget.scrollTo({ top: targetTop, behavior });
  }

  function applyStandaloneMinimapMarkerStyle(marker, isActive) {
    if (!(marker instanceof HTMLElement)) return;
    const theme = deps.getThemeTokens();
    const role = marker.dataset.role || "unknown";
    const isUser = role === "user";
    const isDark = deps.getThemeMode() === "dark";
    const baseColor = isUser
      ? (isDark ? (getUiSettings().userColorDark || "#303030") : (getUiSettings().userColorLight || "#F4F4F4"))
      : (isDark ? (getUiSettings().assistantColorDark || "#202020") : (getUiSettings().assistantColorLight || "#FFFFFF"));
    const hovered = marker.dataset.gptBoostHovered === "1";
    const baseHeight = Math.max(1, Number(marker.dataset.baseHeightPx || "2"));
    const baseOpacity = isUser ? 0.75 : 0.55;

    marker.style.background = baseColor;
    marker.style.opacity = isActive ? "1" : hovered ? String(Math.min(1, baseOpacity + 0.18)) : String(baseOpacity);
    marker.style.height = `${isActive ? Math.max(baseHeight, 4) : baseHeight}px`;
    marker.style.boxShadow = isActive ? `0 0 0 1px ${theme.panelBorder}` : "none";
  }

  function applyStandaloneMinimapViewportThumbTheme(viewportThumb) {
    if (!(viewportThumb instanceof HTMLElement)) return;
    const dark = deps.getThemeMode() === "dark";
    viewportThumb.style.background = dark
      ? "rgba(30, 41, 59, 0.75)"
      : "rgba(0, 0, 0, 0.28)";
    viewportThumb.style.border = dark
      ? "1px solid rgba(100, 116, 139, 0.65)"
      : "1px solid rgba(0, 0, 0, 0.4)";
    viewportThumb.style.boxShadow = dark
      ? "0 1px 3px rgba(0,0,0,0.45)"
      : "0 1px 2px rgba(0,0,0,0.22)";
  }

  function updateStandaloneMinimapViewportRect(track) {
    if (!(track instanceof HTMLElement)) return;
    const viewportThumb = track.querySelector('[data-chatgpt-minimap="viewport"]');
    if (!(viewportThumb instanceof HTMLElement)) return;

    const scrollTarget = deps.getScrollTarget();
    if (!scrollTarget) return;

    const trackHeight = track.clientHeight;
    if (trackHeight <= 0) return;

    const { viewportHeight, viewportTop } = computeViewportThumbLayout({
      trackHeight,
      visibleHeight: scrollTarget.clientHeight || 1,
      contentHeight: scrollTarget.scrollHeight || scrollTarget.clientHeight || 1,
      scrollTop: scrollTarget.scrollTop,
      maxScrollTop: deps.getMaxScrollTop(scrollTarget),
      minViewportHeight: 24
    });

    viewportThumb.style.height = `${viewportHeight}px`;
    viewportThumb.style.top = `${viewportTop}px`;
  }

  function updateStandaloneMinimapViewportState(force = false) {
    if (!refs.minimapPanel || refs.minimapPanel.style.display === "none") return;

    const track = refs.minimapPanel.querySelector('[data-chatgpt-minimap="track"]');
    if (!(track instanceof HTMLElement)) return;
    updateStandaloneMinimapViewportRect(track);

    const nextId = deps.getViewportAnchorVirtualId();
    if (!nextId) return;
    if (!force && nextId === refs.activeStandaloneMinimapVirtualId) return;

    const prevId = refs.activeStandaloneMinimapVirtualId;
    refs.activeStandaloneMinimapVirtualId = nextId;

    const prevMarker = prevId
      ? track.querySelector(`[data-gpt-boost-minimap-marker][data-virtual-id="${deps.escapeSelectorValue(prevId)}"]`)
      : null;
    if (prevMarker instanceof HTMLElement) {
      applyStandaloneMinimapMarkerStyle(prevMarker, false);
    }

    const nextMarker = track.querySelector(
      `[data-gpt-boost-minimap-marker][data-virtual-id="${deps.escapeSelectorValue(nextId)}"]`
    );
    if (!(nextMarker instanceof HTMLElement)) return;
    applyStandaloneMinimapMarkerStyle(nextMarker, true);
  }

  function populateMinimapPanel(panel) {
    const track = panel.querySelector('[data-chatgpt-minimap="track"]');
    if (!(track instanceof HTMLElement)) return;

    track.querySelectorAll('[data-gpt-boost-minimap-marker="1"]').forEach((marker) => marker.remove());
    const items = buildMinimapItems();

    if (!items.length) {
      refs.activeStandaloneMinimapVirtualId = null;
      return;
    }

    const trackHeight = Math.max(1, track.clientHeight);

    items.forEach(({ id, role, position, total, topRatio, heightRatio }) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.setAttribute("data-gpt-boost-minimap-marker", "1");
      marker.dataset.virtualId = id;
      marker.dataset.role = role;
      marker.dataset.position = String(position);
      marker.dataset.total = String(total);
      const { baseHeightPx, topPx } = computeMarkerGeometry({
        trackHeight,
        topRatio,
        heightRatio
      });
      marker.dataset.baseHeightPx = String(baseHeightPx);
      marker.style.position = "absolute";
      const isUser = role === "user";
      marker.style.left = isUser ? "26%" : "6%";
      marker.style.right = isUser ? "6%" : "6%";
      marker.style.top = `${topPx}px`;
      marker.style.transform = "none";
      marker.style.border = "none";
      marker.style.borderRadius = "1px";
      marker.style.padding = "0";
      marker.style.cursor = "pointer";
      marker.style.zIndex = "2";
      marker.style.transition = "height 120ms ease, opacity 120ms ease, box-shadow 120ms ease";
      applyStandaloneMinimapMarkerStyle(marker, false);
      marker.addEventListener("mouseenter", () => {
        marker.dataset.gptBoostHovered = "1";
        applyStandaloneMinimapMarkerStyle(marker, marker.dataset.virtualId === refs.activeStandaloneMinimapVirtualId);
      });
      marker.addEventListener("mouseleave", () => {
        delete marker.dataset.gptBoostHovered;
        applyStandaloneMinimapMarkerStyle(marker, marker.dataset.virtualId === refs.activeStandaloneMinimapVirtualId);
      });
      marker.addEventListener("click", () => scrollToMinimapItem(id));
      track.appendChild(marker);
    });

    refs.activeStandaloneMinimapVirtualId = null;
    updateStandaloneMinimapViewportState(true);
  }

  function showMinimapPanel() {
    const panel = ensureMinimapPanel();
    if (!panel) return;
    panel.style.display = "block";
    populateMinimapPanel(panel);
    deps.applyFloatingUiOffsets();
  }

  function toggleMinimapPanel() {
    const panel = ensureMinimapPanel();
    if (!panel) return;
    const isOpen = panel.style.display !== "none";
    if (isOpen) {
      hideMinimapPanel();
      return;
    }
    showMinimapPanel();
  }

  function ensureMinimapButton() {
    if (refs.minimapButton && refs.minimapButton.isConnected) {
      return refs.minimapButton;
    }
    if (!document.body) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-chatgpt-minimap", "toggle");
    button.style.position = "fixed";
    button.style.right = `${constants.minimapButtonRightOffsetPx}px`;
    button.style.top = `${constants.minimapButtonTopOffsetPx}px`;
    button.style.zIndex = "10002";
    button.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.style.width = "14px";
    icon.style.height = "14px";
    icon.style.fill = "currentColor";

    const lines = [
      "M3 6h18v2H3zm0 5h18v2H3zm0 5h12v2H3z"
    ];
    lines.forEach((d) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      icon.appendChild(path);
    });

    button.appendChild(icon);
    button.setAttribute("aria-label", "Toggle conversation map");
    deps.styleSearchButton(button, constants.minimapButtonSizePx);
    button.style.display = "none";
    button.addEventListener("click", toggleMinimapPanel);

    document.body.appendChild(button);
    refs.minimapButton = button;
    deps.applyFloatingUiOffsets();
    deps.applyThemeToUi();
    return button;
  }

  function ensureMinimapPanel() {
    if (refs.minimapPanel && refs.minimapPanel.isConnected) {
      return refs.minimapPanel;
    }
    if (!document.body) return null;

    const panel = document.createElement("div");
    panel.setAttribute("data-chatgpt-minimap", "panel");
    panel.style.position = "fixed";
    panel.style.top = `${constants.minimapPanelTopOffsetPx}px`;
    panel.style.right = `${constants.minimapPanelRightOffsetPx}px`;
    panel.style.zIndex = "10001";
    panel.style.width = `${constants.minimapPanelWidthPx}px`;
    panel.style.height = `${constants.minimapTrackHeightPx}px`;
    panel.style.display = "none";
    panel.style.padding = "0";
    panel.style.borderRadius = "4px";
    panel.style.background = "rgba(15, 23, 42, 0.5)";
    panel.style.backdropFilter = "blur(2px)";
    panel.style.overflow = "hidden";
    panel.style.boxSizing = "border-box";

    const track = document.createElement("div");
    track.setAttribute("data-chatgpt-minimap", "track");
    track.style.position = "relative";
    track.style.height = "100%";
    track.style.width = "100%";
    track.style.background = "linear-gradient(to bottom, rgba(148,163,184,0.2), rgba(148,163,184,0.08))";
    track.style.maskImage = "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)";
    track.style.WebkitMaskImage = "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)";

    const viewportThumb = document.createElement("div");
    viewportThumb.setAttribute("data-chatgpt-minimap", "viewport");
    viewportThumb.style.position = "absolute";
    viewportThumb.style.left = "2px";
    viewportThumb.style.right = "2px";
    viewportThumb.style.top = "0";
    viewportThumb.style.height = "24px";
    viewportThumb.style.borderRadius = "2px";
    viewportThumb.style.background = "rgba(255,255,255,0.5)";
    viewportThumb.style.border = "1px solid rgba(255,255,255,0.35)";
    viewportThumb.style.boxShadow = "0 1px 2px rgba(0,0,0,0.2)";
    viewportThumb.style.cursor = "grab";
    viewportThumb.style.pointerEvents = "auto";
    viewportThumb.style.zIndex = "4";
    applyStandaloneMinimapViewportThumbTheme(viewportThumb);

    let isDraggingViewport = false;
    let dragOffsetY = 0;

    const pointerToRatio = (clientY, centerOnPointer = false) => {
      const rect = track.getBoundingClientRect();
      const thumbHeight = viewportThumb.getBoundingClientRect().height || 24;
      const rawTop = centerOnPointer
        ? (clientY - rect.top - thumbHeight / 2)
        : (clientY - rect.top - dragOffsetY);
      const maxTop = Math.max(1, rect.height - thumbHeight);
      const clampedTop = Math.min(maxTop, Math.max(0, rawTop));
      return maxTop > 0 ? clampRatio(clampedTop / maxTop) : 0;
    };

    viewportThumb.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      isDraggingViewport = true;
      dragOffsetY = event.clientY - viewportThumb.getBoundingClientRect().top;
      viewportThumb.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    });

    track.addEventListener("mousedown", (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest('[data-chatgpt-minimap="viewport"]')) return;
      event.preventDefault();
      const ratio = pointerToRatio(event.clientY, true);
      scrollToMinimapRatio(ratio, "auto");
    });

    window.addEventListener("mousemove", (event) => {
      if (!isDraggingViewport) return;
      const ratio = pointerToRatio(event.clientY, false);
      scrollToMinimapRatio(ratio, "auto");
    });

    window.addEventListener("mouseup", () => {
      if (!isDraggingViewport) return;
      isDraggingViewport = false;
      dragOffsetY = 0;
      viewportThumb.style.cursor = "grab";
      document.body.style.userSelect = "";
    });

    track.appendChild(viewportThumb);
    panel.appendChild(track);

    document.body.appendChild(panel);
    refs.minimapPanel = panel;
    deps.applyFloatingUiOffsets();
    deps.applyThemeToUi();
    return panel;
  }

  function updateMinimapVisibility(totalMessages) {
    const shouldShow = state.enabled && getUiSettings().minimapVisible && totalMessages > 0;
    if (refs.minimapButton) refs.minimapButton.style.display = "none";
    const panel = ensureMinimapPanel();
    if (!panel) return;
    if (!shouldShow) {
      hideMinimapPanel();
      return;
    }
    panel.style.display = "block";
    if (!panel.querySelector("[data-gpt-boost-minimap-marker]")) {
      populateMinimapPanel(panel);
    }
    deps.applyFloatingUiOffsets();
  }

  function applyTheme(theme) {
    if (!refs.minimapPanel) return;
    refs.minimapPanel.style.background =
      deps.getThemeMode() === "dark"
        ? "rgba(15, 23, 42, 0.5)"
        : "rgba(255, 255, 255, 0.5)";
    refs.minimapPanel.style.boxShadow = "none";
    refs.minimapPanel.style.border = `1px solid ${theme.panelBorder}`;
    refs.minimapPanel.style.color = theme.text;

    const track = refs.minimapPanel.querySelector('[data-chatgpt-minimap="track"]');
    if (track instanceof HTMLElement) {
      track.style.background =
        deps.getThemeMode() === "dark"
          ? "linear-gradient(to bottom, rgba(148,163,184,0.2), rgba(148,163,184,0.08))"
          : "linear-gradient(to bottom, rgba(32,33,35,0.2), rgba(32,33,35,0.08))";
      const viewportThumb = track.querySelector('[data-chatgpt-minimap="viewport"]');
      applyStandaloneMinimapViewportThumbTheme(viewportThumb);
    }
  }

  function applyFloatingLayout(offsetPx, topButtonTopPx, bottomButtonTopPx) {
    if (!refs.minimapPanel) return;
    const minimapTop = topButtonTopPx + constants.scrollButtonSizePx + constants.minimapButtonGapPx;
    const minimapBottom = Math.max(minimapTop + 80, bottomButtonTopPx - constants.minimapButtonGapPx);
    const minimapHeight = Math.max(80, minimapBottom - minimapTop);

    refs.minimapPanel.style.top = `${Math.round(minimapTop)}px`;
    refs.minimapPanel.style.right = `${constants.minimapPanelRightOffsetPx + offsetPx}px`;
    refs.minimapPanel.style.width = `${constants.minimapPanelWidthPx}px`;
    refs.minimapPanel.style.height = `${Math.round(minimapHeight)}px`;
  }

  return {
    hideMinimapPanel,
    hideMinimapUi,
    buildMinimapItems,
    scrollToMinimapItem,
    scrollToMinimapRatio,
    applyStandaloneMinimapMarkerStyle,
    applyStandaloneMinimapViewportThumbTheme,
    updateStandaloneMinimapViewportRect,
    updateStandaloneMinimapViewportState,
    populateMinimapPanel,
    showMinimapPanel,
    toggleMinimapPanel,
    ensureMinimapButton,
    ensureMinimapPanel,
    updateMinimapVisibility,
    applyTheme,
    applyFloatingLayout
  };
}
