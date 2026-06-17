export function createLayoutOffsetsManager({
  state,
  refs,
  constants,
  deps
}) {
  const sidebarLayoutOriginalStyles = new Map();
  let sidebarBodyMarginOriginal = "";
  let sidebarBodyTransitionOriginal = "";
  let sidebarBodyFallbackUsed = false;

  function collectSidebarLayoutTargets() {
    const targets = [];

    const scrollOwner = state.scrollElement instanceof HTMLElement ? state.scrollElement : null;
    if (scrollOwner) {
      targets.push(scrollOwner);
    } else {
      const mainRoot =
        document.querySelector('[role="main"]') ||
        document.querySelector("main") ||
        (state.conversationRoot instanceof HTMLElement ? state.conversationRoot : null);
      if (mainRoot instanceof HTMLElement) {
        targets.push(mainRoot);
      }
    }

    const composer = document.querySelector("textarea");
    if (composer instanceof HTMLTextAreaElement) {
      let fixedAncestor = null;
      let ancestor = composer.closest("form") || composer.parentElement;
      while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
        if (ancestor instanceof HTMLElement) {
          const pos = getComputedStyle(ancestor).position;
          if (pos === "fixed" || pos === "sticky") {
            fixedAncestor = ancestor;
            break;
          }
        }
        ancestor = ancestor.parentElement;
      }
      if (fixedAncestor && !targets.includes(fixedAncestor)) {
        targets.push(fixedAncestor);
      }
    }

    const sidebarPanel = refs.sidebarPanel;
    const filtered = targets.filter((el) => {
      if (!(el instanceof HTMLElement) || !el.isConnected) return false;
      if (sidebarPanel && sidebarPanel.contains(el)) return false;
      return !targets.some((other) => other !== el && other instanceof HTMLElement && other.contains(el));
    });
    return filtered;
  }

  function clearSidebarLayoutOffset() {
    sidebarLayoutOriginalStyles.forEach((original, el) => {
      if (!(el instanceof HTMLElement) || !el.isConnected) return;
      el.style.marginRight = original.marginRight;
      el.style.right = original.right;
      el.style.boxSizing = original.boxSizing;
      el.style.transition = original.transition;
    });
    sidebarLayoutOriginalStyles.clear();

    if (sidebarBodyFallbackUsed) {
      document.body.style.marginRight = sidebarBodyMarginOriginal;
      document.body.style.transition = sidebarBodyTransitionOriginal;
    }
    sidebarBodyFallbackUsed = false;
    sidebarBodyMarginOriginal = "";
    sidebarBodyTransitionOriginal = "";
  }

  function applySidebarLayoutOffset(offsetPx, transitionMs = constants.sidebarTransitionMs) {
    clearSidebarLayoutOffset();
    if (!offsetPx) return;

    const targets = collectSidebarLayoutTargets();
    if (!targets.length) {
      sidebarBodyFallbackUsed = true;
      sidebarBodyMarginOriginal = document.body.style.marginRight;
      sidebarBodyTransitionOriginal = document.body.style.transition;
      document.body.style.marginRight = `${offsetPx}px`;
      document.body.style.transition = `margin-right ${transitionMs}ms ease`;
      return;
    }

    targets.forEach((el) => {
      const computed = getComputedStyle(el);
      sidebarLayoutOriginalStyles.set(el, {
        paddingRight: el.style.paddingRight,
        marginRight: el.style.marginRight,
        right: el.style.right,
        boxSizing: el.style.boxSizing,
        transition: el.style.transition
      });

      const hasTextarea = !!el.querySelector("textarea");
      const isFixedLike = computed.position === "fixed" || computed.position === "sticky";
      if (hasTextarea && isFixedLike) {
        const baseRight = computed.right && computed.right !== "auto" ? computed.right : "0px";
        el.style.right = `calc(${baseRight} + ${offsetPx}px)`;
      } else {
        const isRootContainer =
          el === document.documentElement ||
          el === document.body ||
          el.tagName.toLowerCase() === "main";
        const isScrollOwner = el === state.scrollElement;
        if (isRootContainer || isScrollOwner) {
          const baseMarginRight = computed.marginRight || "0px";
          el.style.marginRight = `calc(${baseMarginRight} + ${offsetPx}px)`;
        } else {
          const basePaddingRight = computed.paddingRight || "0px";
          el.style.paddingRight = `calc(${basePaddingRight} + ${offsetPx}px)`;
          el.style.boxSizing = "border-box";
        }
      }
      el.style.transition = `margin-right ${transitionMs}ms ease, padding-right ${transitionMs}ms ease, right ${transitionMs}ms ease`;
    });
  }

  function getSidebarUiOffsetPx() {
    return deps.isSidebarOpen() ? refs.currentSidebarWidthPx : 0;
  }

  function applyFloatingUiOffsets() {
    const offset = getSidebarUiOffsetPx();
    const minimapVisible = !!(
      refs.minimapPanel &&
      refs.minimapPanel.style.display !== "none"
    );
    const minimapLaneOffset = minimapVisible
      ? (constants.minimapControlClearancePx || constants.minimapPanelWidthPx || 0)
      : 0;
    const rightOffset = offset + minimapLaneOffset;

    if (refs.indicatorElement) {
      refs.indicatorElement.style.right = `${constants.indicatorRightOffsetPx + rightOffset}px`;
    }

    let currentTop = constants.sidebarToggleTopOffsetPx;

    if (refs.sidebarToggleButton && refs.sidebarToggleButton.style.display !== "none") {
      refs.sidebarToggleButton.style.top = `${currentTop}px`;
      refs.sidebarToggleButton.style.right = `${constants.sidebarToggleRightOffsetPx + rightOffset}px`;
      currentTop += constants.sidebarToggleSizePx + constants.searchButtonGapPx;
    }

    if (refs.searchButton && refs.searchButton.style.display !== "none") {
      refs.searchButton.style.top = `${currentTop}px`;
      refs.searchButton.style.right = `${constants.searchButtonRightOffsetPx + rightOffset}px`;
      if (refs.searchPanel) refs.searchPanel.style.top = `${currentTop}px`;
      if (refs.searchPanel) refs.searchPanel.style.right = `${constants.searchPanelRightOffsetPx + rightOffset}px`;
      currentTop += constants.searchButtonSizePx + constants.searchButtonGapPx;
    }

    if (refs.downloadButton && refs.downloadButton.style.display !== "none") {
      refs.downloadButton.style.top = `${currentTop}px`;
      refs.downloadButton.style.right = `${constants.downloadButtonRightOffsetPx + rightOffset}px`;
      currentTop += constants.downloadButtonSizePx + constants.downloadButtonGapPx;
    }

    if (refs.scrollToTopButton && refs.scrollToTopButton.style.display !== "none") {
      refs.scrollToTopButton.style.top = `${currentTop}px`;
      refs.scrollToTopButton.style.right = `${constants.scrollButtonOffsetPx + rightOffset}px`;
    }

    if (refs.scrollToBottomButton) {
      refs.scrollToBottomButton.style.right = `${constants.scrollButtonOffsetPx + rightOffset}px`;
    }

    if (refs.minimapPanel) {
      const topButtonTop = refs.scrollToTopButton && refs.scrollToTopButton.style.top
        ? parseFloat(refs.scrollToTopButton.style.top) || constants.scrollButtonTopOffsetPx
        : constants.scrollButtonTopOffsetPx;
      const bottomButtonTop = window.innerHeight - (constants.scrollButtonOffsetPx + rightOffset) - constants.scrollButtonSizePx;
      deps.applyMinimapFloatingLayout(offset, topButtonTop, bottomButtonTop);
    }
  }

  return {
    applyFloatingUiOffsets,
    applySidebarLayoutOffset
  };
}
