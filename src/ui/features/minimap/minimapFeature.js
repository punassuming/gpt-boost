import {
  clampRatio,
  computeScrollTopFromRatio,
  computeViewportThumbLayout
} from './minimapMath.js';
import {
  buildMinimapItems as buildItems,
  computeMarkerGeometry
} from './minimapModel.js';
import { createSvgIcon } from '../../shell/icons.js';

export function createMinimapFeature({
  refs,
  state,
  constants,
  getUiSettings,
  deps
}) {
  const EDGE_FEATHER_MASK = "radial-gradient(160% 128% at 50% 50%, black 42%, rgba(0,0,0,0.95) 58%, rgba(0,0,0,0.55) 76%, transparent 100%)";
  const TRACK_FEATHER_MASK = "radial-gradient(160% 128% at 50% 50%, black 46%, rgba(0,0,0,0.95) 62%, rgba(0,0,0,0.6) 78%, transparent 100%)";
  const MIN_VIEWPORT_HEIGHT_PX = 24;
  const minimapModelCache = new Map();
  const markerRegistry = new Map();
  let trackElement = null;
  let viewportThumbElement = null;

  function applyEdgeFeatherMask(el, maskValue) {
    if (!(el instanceof HTMLElement)) return;
    el.style.maskImage = maskValue;
    el.style.WebkitMaskImage = maskValue;
  }

  function isPanelOpen() {
    return !!(
      refs.minimapPanel &&
      refs.minimapPanel.isConnected &&
      refs.minimapPanel.style.display !== "none"
    );
  }

  function getTrack(panel = refs.minimapPanel) {
    if (trackElement instanceof HTMLElement && trackElement.isConnected) {
      return trackElement;
    }
    if (!(panel instanceof HTMLElement)) return null;
    const track = panel.querySelector('[data-chatgpt-minimap="track"]');
    trackElement = track instanceof HTMLElement ? track : null;
    return trackElement;
  }

  function getViewportThumb(track = getTrack()) {
    if (viewportThumbElement instanceof HTMLElement && viewportThumbElement.isConnected) {
      return viewportThumbElement;
    }
    if (!(track instanceof HTMLElement)) return null;
    const viewportThumb = track.querySelector('[data-chatgpt-minimap="viewport"]');
    viewportThumbElement = viewportThumb instanceof HTMLElement ? viewportThumb : null;
    return viewportThumbElement;
  }

  function buildMinimapItems() {
    return buildItems({
      ensureVirtualIds: deps.ensureVirtualIds,
      articleMap: state.articleMap,
      getMessageRole: deps.getMessageRole,
      getCodeSnippetVirtualIds: deps.getCodeSnippetVirtualIds,
      getSearchHitVirtualIds: deps.getSearchHitVirtualIds,
      cache: minimapModelCache
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

  function ensureMarkerRefs(marker) {
    if (!(marker instanceof HTMLElement)) return null;
    if (marker._gptBoostMinimapRefs) return marker._gptBoostMinimapRefs;
    const refsObject = {
      lineNodes: [],
      overlays: null,
      searchOverlay: null,
      codeOverlay: null
    };
    marker._gptBoostMinimapRefs = refsObject;
    return refsObject;
  }

  function applyStandaloneMinimapMarkerStyle(marker, isActive) {
    if (!(marker instanceof HTMLElement)) return;
    const theme = deps.getThemeTokens();
    const role = marker.dataset.role || "unknown";
    const isUser = role === "user";
    const hovered = marker.dataset.gptBoostHovered === "1";
    const isDark = deps.getThemeMode() === "dark";
    const markerRefs = ensureMarkerRefs(marker);
    const lineNodes = markerRefs?.lineNodes || [];
    const overlayNodes = [markerRefs?.searchOverlay, markerRefs?.codeOverlay].filter((node) => node instanceof HTMLElement);

    marker.style.opacity = isActive ? "1" : hovered ? "0.92" : "0.76";
    marker.style.boxShadow = isActive ? `0 0 0 1px ${theme.panelBorder}` : "none";
    marker.style.background = "transparent";

    lineNodes.forEach((line) => {
      const baseColor = isDark
        ? (isUser ? "rgba(226, 232, 240, 0.42)" : "rgba(148, 163, 184, 0.38)")
        : (isUser ? "rgba(51, 65, 85, 0.24)" : "rgba(51, 65, 85, 0.18)");
      const activeColor = isDark
        ? "rgba(226, 232, 240, 0.7)"
        : "rgba(15, 23, 42, 0.4)";
      line.style.background = isActive ? activeColor : baseColor;
    });

    overlayNodes.forEach((overlay) => {
      if (overlay.dataset.overlayType === "search") {
        overlay.style.background = "rgba(251, 191, 36, 0.92)";
        overlay.style.boxShadow = "0 0 0 1px rgba(251, 191, 36, 0.2)";
      } else if (overlay.dataset.overlayType === "code") {
        overlay.style.background = "rgba(59, 130, 246, 0.9)";
        overlay.style.boxShadow = "0 0 0 1px rgba(59, 130, 246, 0.2)";
      }
    });
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

  function updateStandaloneMinimapViewportRect(track = getTrack()) {
    if (!(track instanceof HTMLElement)) return;
    const viewportThumb = getViewportThumb(track);
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
      minViewportHeight: MIN_VIEWPORT_HEIGHT_PX
    });

    viewportThumb.style.height = `${viewportHeight}px`;
    viewportThumb.style.top = `${viewportTop}px`;
  }

  function updateStandaloneMinimapViewportState(force = false) {
    if (!isPanelOpen()) return;

    const track = getTrack();
    if (!(track instanceof HTMLElement)) return;
    updateStandaloneMinimapViewportRect(track);

    const nextId = deps.getViewportAnchorVirtualId();
    if (!nextId) return;
    if (!force && nextId === refs.activeStandaloneMinimapVirtualId) return;

    const prevId = refs.activeStandaloneMinimapVirtualId;
    refs.activeStandaloneMinimapVirtualId = nextId;

    const prevEntry = prevId ? markerRegistry.get(prevId) : null;
    if (prevEntry?.marker instanceof HTMLElement) {
      applyStandaloneMinimapMarkerStyle(prevEntry.marker, false);
    }

    const nextEntry = markerRegistry.get(nextId);
    if (!(nextEntry?.marker instanceof HTMLElement)) return;
    applyStandaloneMinimapMarkerStyle(nextEntry.marker, true);
  }

  function createMarkerEntry(item) {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.setAttribute("data-gpt-boost-minimap-marker", "1");
    marker.style.position = "absolute";
    marker.style.transform = "none";
    marker.style.border = "none";
    marker.style.borderRadius = "5px";
    marker.style.padding = "0";
    marker.style.cursor = "pointer";
    marker.style.zIndex = "2";
    marker.style.display = "flex";
    marker.style.flexDirection = "column";
    marker.style.justifyContent = "center";
    marker.style.gap = "2px";
    marker.style.overflow = "visible";
    marker.style.transition = "opacity 120ms ease, box-shadow 120ms ease";
    marker.style.background = "transparent";
    marker.style.boxSizing = "border-box";
    marker.addEventListener("mouseenter", () => {
      marker.dataset.gptBoostHovered = "1";
      applyStandaloneMinimapMarkerStyle(marker, marker.dataset.virtualId === refs.activeStandaloneMinimapVirtualId);
    });
    marker.addEventListener("mouseleave", () => {
      delete marker.dataset.gptBoostHovered;
      applyStandaloneMinimapMarkerStyle(marker, marker.dataset.virtualId === refs.activeStandaloneMinimapVirtualId);
    });
    marker.addEventListener("click", () => scrollToMinimapItem(marker.dataset.virtualId || item.id));
    ensureMarkerRefs(marker);
    return { marker, item: null };
  }

  function syncMarkerLines(entry, item, baseHeightPx) {
    const markerRefs = ensureMarkerRefs(entry.marker);
    const desiredCount = item.lineRatios.length;

    while (markerRefs.lineNodes.length > desiredCount) {
      const line = markerRefs.lineNodes.pop();
      line?.remove();
    }

    while (markerRefs.lineNodes.length < desiredCount) {
      const line = document.createElement("div");
      line.setAttribute("data-gpt-boost-minimap-line", "1");
      line.style.borderRadius = "999px";
      line.style.maxWidth = "100%";
      markerRefs.lineNodes.push(line);
      entry.marker.appendChild(line);
    }

    const lineHeightPx = Math.max(1, Math.min(3, Math.floor(baseHeightPx / Math.max(2, item.lineCount || 1))));
    markerRefs.lineNodes.forEach((line, lineIndex) => {
      const ratio = item.lineRatios[lineIndex] || 0.6;
      line.style.height = `${lineHeightPx}px`;
      line.style.width = `${Math.round(ratio * 100)}%`;
      line.style.minWidth = `${lineIndex === desiredCount - 1 ? 28 : 34}%`;
    });
  }

  function ensureOverlayContainer(entry, isUser) {
    const markerRefs = ensureMarkerRefs(entry.marker);
    if (markerRefs.overlays instanceof HTMLElement) {
      markerRefs.overlays.style.left = isUser ? "-8px" : "";
      markerRefs.overlays.style.right = isUser ? "" : "-8px";
      return markerRefs.overlays;
    }
    const overlays = document.createElement("div");
    overlays.style.position = "absolute";
    overlays.style.top = "50%";
    overlays.style.transform = "translateY(-50%)";
    overlays.style.display = "flex";
    overlays.style.flexDirection = "column";
    overlays.style.gap = "3px";
    overlays.style.alignItems = "center";
    overlays.style.pointerEvents = "none";
    overlays.style.left = isUser ? "-8px" : "";
    overlays.style.right = isUser ? "" : "-8px";
    markerRefs.overlays = overlays;
    entry.marker.appendChild(overlays);
    return overlays;
  }

  function ensureOverlayNode(entry, overlayType) {
    const markerRefs = ensureMarkerRefs(entry.marker);
    const existing = overlayType === "search" ? markerRefs.searchOverlay : markerRefs.codeOverlay;
    if (existing instanceof HTMLElement) return existing;
    const overlay = document.createElement("div");
    overlay.setAttribute("data-gpt-boost-minimap-overlay", "1");
    overlay.dataset.overlayType = overlayType;
    overlay.style.width = overlayType === "search" ? "4px" : "6px";
    overlay.style.height = overlayType === "search" ? "10px" : "6px";
    overlay.style.borderRadius = overlayType === "search" ? "999px" : "2px";
    if (overlayType === "search") {
      markerRefs.searchOverlay = overlay;
    } else {
      markerRefs.codeOverlay = overlay;
    }
    return overlay;
  }

  function syncMarkerSignals(entry, item) {
    const markerRefs = ensureMarkerRefs(entry.marker);
    const isUser = item.role === "user";
    const shouldHaveOverlays = item.hasSearchHit || item.hasCodeSnippet;
    const overlayContainer = shouldHaveOverlays
      ? ensureOverlayContainer(entry, isUser)
      : markerRefs.overlays;

    if (item.hasSearchHit) {
      const searchOverlay = ensureOverlayNode(entry, "search");
      if (overlayContainer && !searchOverlay.isConnected) overlayContainer.appendChild(searchOverlay);
    } else if (markerRefs.searchOverlay instanceof HTMLElement) {
      markerRefs.searchOverlay.remove();
      markerRefs.searchOverlay = null;
    }

    if (item.hasCodeSnippet) {
      const codeOverlay = ensureOverlayNode(entry, "code");
      if (overlayContainer && !codeOverlay.isConnected) overlayContainer.appendChild(codeOverlay);
    } else if (markerRefs.codeOverlay instanceof HTMLElement) {
      markerRefs.codeOverlay.remove();
      markerRefs.codeOverlay = null;
    }

    if (
      markerRefs.overlays instanceof HTMLElement &&
      !markerRefs.searchOverlay &&
      !markerRefs.codeOverlay
    ) {
      markerRefs.overlays.remove();
      markerRefs.overlays = null;
    }
  }

  function syncMarkerStructure(entry, item, trackHeight) {
    const { marker } = entry;
    const isUser = item.role === "user";
    const { baseHeightPx, topPx } = computeMarkerGeometry({
      trackHeight,
      topRatio: item.topRatio,
      heightRatio: item.heightRatio,
      lineCount: item.lineCount
    });

    marker.dataset.virtualId = item.id;
    marker.dataset.role = item.role;
    marker.dataset.position = String(item.position);
    marker.dataset.total = String(item.total);
    marker.dataset.baseHeightPx = String(baseHeightPx);
    marker.style.left = isUser ? "30%" : "8%";
    marker.style.right = isUser ? "8%" : "20%";
    marker.style.top = `${topPx}px`;
    marker.style.height = `${baseHeightPx}px`;
    marker.style.minHeight = `${baseHeightPx}px`;
    marker.style.alignItems = isUser ? "flex-end" : "flex-start";

    syncMarkerLines(entry, item, baseHeightPx);
    syncMarkerSignals(entry, item);
    entry.item = item;
  }

  function removeStaleMarkers(validIds) {
    Array.from(markerRegistry.entries()).forEach(([id, entry]) => {
      if (validIds.has(id)) return;
      entry.marker?.remove();
      markerRegistry.delete(id);
    });
  }

  function populateMinimapPanel(panel = refs.minimapPanel) {
    if (!(panel instanceof HTMLElement)) return;
    const track = getTrack(panel);
    if (!(track instanceof HTMLElement)) return;

    const items = buildMinimapItems();
    if (!items.length) {
      removeStaleMarkers(new Set());
      refs.activeStandaloneMinimapVirtualId = null;
      return;
    }

    const validIds = new Set(items.map(({ id }) => id));
    removeStaleMarkers(validIds);

    const trackHeight = Math.max(1, track.clientHeight);
    const markerFragment = document.createDocumentFragment();
    items.forEach((item) => {
      let entry = markerRegistry.get(item.id);
      if (!entry) {
        entry = createMarkerEntry(item);
        markerRegistry.set(item.id, entry);
      }
      syncMarkerStructure(entry, item, trackHeight);
      markerFragment.appendChild(entry.marker);
    });

    track.appendChild(markerFragment);
    const viewportThumb = getViewportThumb(track);
    if (viewportThumb instanceof HTMLElement) {
      track.appendChild(viewportThumb);
    }

    refs.activeStandaloneMinimapVirtualId = null;
    updateStandaloneMinimapViewportState(true);
  }

  function refreshMinimapSignals() {
    if (!isPanelOpen() || !markerRegistry.size) return;
    const searchHitIds = typeof deps.getSearchHitVirtualIds === "function"
      ? deps.getSearchHitVirtualIds()
      : new Set();
    const codeSnippetIds = typeof deps.getCodeSnippetVirtualIds === "function"
      ? deps.getCodeSnippetVirtualIds()
      : new Set();

    markerRegistry.forEach((entry, id) => {
      if (!entry.item) return;
      const nextItem = {
        ...entry.item,
        hasSearchHit: searchHitIds instanceof Set ? searchHitIds.has(id) : false,
        hasCodeSnippet: codeSnippetIds instanceof Set ? codeSnippetIds.has(id) : false
      };
      if (
        nextItem.hasSearchHit === entry.item.hasSearchHit &&
        nextItem.hasCodeSnippet === entry.item.hasCodeSnippet
      ) {
        return;
      }
      syncMarkerSignals(entry, nextItem);
      entry.item = nextItem;
      applyStandaloneMinimapMarkerStyle(entry.marker, id === refs.activeStandaloneMinimapVirtualId);
    });
  }

  function showMinimapPanel() {
    const panel = ensureMinimapPanel();
    if (!panel) return;
    panel.style.display = "block";
    populateMinimapPanel(panel);
    deps.applyFloatingUiOffsets();
  }

  function hideMinimapPanel() {
    if (refs.minimapPanel) refs.minimapPanel.style.display = "none";
    refs.activeStandaloneMinimapVirtualId = null;
  }

  function hideMinimapUi() {
    if (refs.minimapButton) refs.minimapButton.style.display = "none";
    hideMinimapPanel();
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

    button.appendChild(createSvgIcon("text", 15));
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

    markerRegistry.clear();
    minimapModelCache.clear();
    trackElement = null;
    viewportThumbElement = null;

    const panel = document.createElement("div");
    panel.setAttribute("data-chatgpt-minimap", "panel");
    panel.style.position = "fixed";
    panel.style.top = `${constants.minimapPanelTopOffsetPx}px`;
    panel.style.right = `${constants.minimapPanelRightOffsetPx}px`;
    panel.style.zIndex = "10001";
    panel.style.width = `${constants.minimapPanelWidthPx}px`;
    panel.style.height = `${constants.minimapTrackHeightPx}px`;
    panel.style.marginRight = `${constants.minimapPanelNegativeMarginRightPx || 0}px`;
    panel.style.display = "none";
    panel.style.padding = "0";
    panel.style.borderRadius = "10px";
    panel.style.background = "rgba(15, 23, 42, 0.28)";
    panel.style.backdropFilter = "blur(12px)";
    panel.style.overflow = "hidden";
    panel.style.boxSizing = "border-box";
    applyEdgeFeatherMask(panel, EDGE_FEATHER_MASK);

    const track = document.createElement("div");
    track.setAttribute("data-chatgpt-minimap", "track");
    track.style.position = "relative";
    track.style.height = "100%";
    track.style.width = "100%";
    track.style.background = "linear-gradient(to bottom, rgba(148,163,184,0.14), rgba(148,163,184,0.04))";
    applyEdgeFeatherMask(track, TRACK_FEATHER_MASK);
    trackElement = track;

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
    viewportThumbElement = viewportThumb;

    let isDraggingViewport = false;
    let dragOffsetY = 0;

    const pointerToRatio = (clientY, centerOnPointer = false) => {
      const rect = track.getBoundingClientRect();
      const thumbHeight = viewportThumb.getBoundingClientRect().height || MIN_VIEWPORT_HEIGHT_PX;
      const rawTop = centerOnPointer
        ? (clientY - rect.top - thumbHeight / 2)
        : (clientY - rect.top - dragOffsetY);
      const maxTop = Math.max(1, rect.height - thumbHeight);
      const clampedTop = Math.min(maxTop, Math.max(0, rawTop));
      return maxTop > 0 ? clampRatio(clampedTop / maxTop) : 0;
    };

    viewportThumb.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      isDraggingViewport = true;
      dragOffsetY = event.clientY - viewportThumb.getBoundingClientRect().top;
      viewportThumb.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    });

    track.addEventListener("mousedown", (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.button !== 0) return;
      if (event.target.closest('[data-chatgpt-minimap="viewport"]')) return;
      if (event.target.closest('[data-gpt-boost-minimap-marker]')) return;
      event.preventDefault();
      const ratio = pointerToRatio(event.clientY, true);
      scrollToMinimapRatio(ratio, "auto");
      isDraggingViewport = true;
      dragOffsetY = (viewportThumb.getBoundingClientRect().height || MIN_VIEWPORT_HEIGHT_PX) / 2;
      viewportThumb.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
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
    if (!markerRegistry.size) {
      populateMinimapPanel(panel);
    } else {
      refreshMinimapSignals();
      updateStandaloneMinimapViewportState(true);
    }
    deps.applyFloatingUiOffsets();
  }

  function applyTheme(theme) {
    if (!refs.minimapPanel) return;
    refs.minimapPanel.style.background =
      deps.getThemeMode() === "dark"
        ? "rgba(15, 23, 42, 0.18)"
        : "rgba(255, 255, 255, 0.18)";
    refs.minimapPanel.style.boxShadow = "none";
    refs.minimapPanel.style.border = "none";
    refs.minimapPanel.style.color = theme.text;
    applyEdgeFeatherMask(refs.minimapPanel, EDGE_FEATHER_MASK);

    const track = getTrack();
    if (track instanceof HTMLElement) {
      track.style.background =
        deps.getThemeMode() === "dark"
          ? "linear-gradient(to bottom, rgba(148,163,184,0.09), rgba(148,163,184,0.025))"
          : "linear-gradient(to bottom, rgba(32,33,35,0.08), rgba(32,33,35,0.02))";
      applyEdgeFeatherMask(track, TRACK_FEATHER_MASK);
      applyStandaloneMinimapViewportThumbTheme(getViewportThumb(track));
      markerRegistry.forEach(({ marker }) => {
        applyStandaloneMinimapMarkerStyle(marker, marker.dataset.virtualId === refs.activeStandaloneMinimapVirtualId);
      });
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
    refreshMinimapSignals,
    showMinimapPanel,
    toggleMinimapPanel,
    ensureMinimapButton,
    ensureMinimapPanel,
    updateMinimapVisibility,
    applyTheme,
    applyFloatingLayout
  };
}
