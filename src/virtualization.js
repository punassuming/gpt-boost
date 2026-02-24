import { isVirtualSpacerNode, getMessageRole, findConversationRoot, hasAnyMessages, isElementVisibleForConversation, getActiveConversationNodes, findScrollContainer } from './utils/dom.js';
import { currentConversationKey, persistedPinnedMessageKeys, persistedBookmarkedMessageKeys, scheduleFlagsSave, loadPersistedFlagsForConversation, getArticleMessageKey, setCurrentConversationKey, getConversationStorageKey, loadFlagsStore, loadKnownConversationsStore, summarizeConversationCaches } from './core/storage.js';
import { createVirtualizerStore } from './core/virtualizer/store.ts';
import { setupScrollTracking, createDebouncedObserver } from './core/virtualizer/observer.ts';
import { getThemeMode, getThemeTokens } from './ui/shell/theme.ts';
import { getRoleDisplayLabel, getRoleSurfaceStyle, createRoleChip } from './ui/features/roleStyles.ts';
import { renderSidebarSettingsTab } from './ui/features/sidebar/settingsTab.js';
import { renderSidebarSnippetsTab } from './ui/features/sidebar/snippetsTab.js';
import { toUnixNewlines, inferCodeLanguage } from './ui/features/snippets/codeSnippets.js';
import { createSearchFeature } from './ui/features/search/searchFeature.js';
import { createMinimapFeature } from './ui/features/minimap/minimapFeature.js';
import { createMapFeature } from './ui/features/map/mapFeature.js';
import {
  DEFAULT_EXTENSION_SETTINGS,
  normalizeExtensionSettings,
  normalizeColorHex,
  normalizeSidebarHotkey,
  hotkeyMatchesKeyboardEvent,
  getSettingsStorageArea,
  normalizeSidebarWidthPx,
  normalizeConversationPaddingPx,
  normalizeComposerWidthPx,
  normalizeScrollThrottleMs,
  normalizeMutationDebounceMs,
  SIDEBAR_WIDTH_MIN_PX,
  SIDEBAR_WIDTH_MAX_PX,
  CONVERSATION_PADDING_MIN_PX,
  CONVERSATION_PADDING_MAX_PX,
  COMPOSER_WIDTH_MIN_PX,
  COMPOSER_WIDTH_MAX_PX,
  SCROLL_THROTTLE_MIN_MS,
  SCROLL_THROTTLE_MAX_MS,
  MUTATION_DEBOUNCE_MIN_MS,
  MUTATION_DEBOUNCE_MAX_MS
} from './core/settings.js';

// virtualization.js
(function initializeVirtualizationModule() {
  const scroller = window.ChatGPTVirtualScroller;
  const store = createVirtualizerStore(scroller);
  const config = store.config;
  const state = store.state;
  const log = scroller.log;
  let indicatorElement = null;
  let scrollToTopButton = null;
  let scrollToBottomButton = null;
  let searchButton = null;
  let searchPanel = null;
  let minimapButton = null;
  let minimapPanel = null;
  let searchInput = null;
  let searchPrevButton = null;
  let searchNextButton = null;
  let searchCountLabel = null;
  let searchCountPrimaryLabel = null;
  let searchCountSecondaryLabel = null;
  let searchCloseButton = null;
  let searchDebounceTimer = null;
  let highlightedSearchElement = null;
  let themeObserver = null;
  let sidebarToggleButton = null;
  let sidebarPanel = null;
  let sidebarContentContainer = null;
  let activeMapVirtualId = null;
  let activeStandaloneMinimapVirtualId = null;
  const sidebarLayoutOriginalStyles = new Map();
  let sidebarBodyMarginOriginal = "";
  let sidebarBodyTransitionOriginal = "";
  let sidebarBodyFallbackUsed = false;
  let activeSidebarTab = "search";
  let conversationLayoutStyleElement = null;
  const searchState = {
    query: "",
    results: [],
    activeIndex: -1,
    indexedTotal: 0,
    matchCount: 0
  };
  let downloadButton = null;
  let bookmarksButton = null;
  let bookmarksPanel = null;
  // codePanelButton/codePanelPanel were refactored into the sidebar snippets tab
  // in b232a91, but their call sites (applyThemeToUi, teardownVirtualizer, updateIndicator)
  // were not cleaned up. Keeping them as null guards prevents ReferenceErrors.
  let codePanelButton = null;
  let codePanelPanel = null;
  let tokenGaugeElement = null;
  let pinnedBarElement = null;
  let deferredVirtualizationTimer = null;
  let hotkeyListenerBound = false;
  const SCROLL_BUTTON_SIZE_PX = 30;
  const SCROLL_BUTTON_OFFSET_PX = 12;
  const TOP_BUTTON_STACK_OFFSET_PX = 56;
  const DEFERRED_VIRTUALIZATION_DELAY_MS = 250;
  const MAX_EMPTY_RETRY_COUNT = 240;
  // Keep the indicator close to the scrollbar without overlapping it.
  const INDICATOR_RIGHT_OFFSET_PX = 6;
  const INDICATOR_BASE_MIN_HEIGHT_PX = 36;
  const INDICATOR_BASE_MAX_HEIGHT_PX = 160;
  const INDICATOR_BUFFER_MIN_BOOST_PX = 14;
  const INDICATOR_BUFFER_MAX_BOOST_PX = 60;
  const INDICATOR_MIN_OPACITY = 0.4;
  const INDICATOR_MAX_OPACITY = 0.95;
  const MAX_SCROLL_ATTEMPTS = 2;
  const SCROLL_RETRY_DELAY_MS = 300;
  // 10px buffer prevents flicker from tiny overflow rounding differences.
  const SCROLL_BUFFER_PX = 10;
  const MINIMAP_BUTTON_SIZE_PX = 30;
  const MINIMAP_BUTTON_GAP_PX = 8;
  const MINIMAP_BUTTON_RIGHT_OFFSET_PX = SCROLL_BUTTON_OFFSET_PX;
  const MINIMAP_BUTTON_TOP_OFFSET_PX = TOP_BUTTON_STACK_OFFSET_PX;
  const MINIMAP_PANEL_RIGHT_OFFSET_PX = SCROLL_BUTTON_OFFSET_PX;
  const MINIMAP_PANEL_TOP_OFFSET_PX = MINIMAP_BUTTON_TOP_OFFSET_PX;
  const MINIMAP_PANEL_WIDTH_PX = SCROLL_BUTTON_SIZE_PX;
  const MINIMAP_TRACK_HEIGHT_PX = 420;
  const MINIMAP_PROMPT_SNIPPET_LENGTH = 60;
  const SEARCH_BUTTON_SIZE_PX = 30;
  const SEARCH_BUTTON_GAP_PX = 8;
  const SEARCH_BUTTON_RIGHT_OFFSET_PX = SCROLL_BUTTON_OFFSET_PX;
  const SEARCH_BUTTON_TOP_OFFSET_PX =
    MINIMAP_BUTTON_TOP_OFFSET_PX +
    MINIMAP_BUTTON_SIZE_PX +
    MINIMAP_BUTTON_GAP_PX;
  const DOWNLOAD_BUTTON_SIZE_PX = 30;
  const DOWNLOAD_BUTTON_GAP_PX = 8;
  const DOWNLOAD_BUTTON_RIGHT_OFFSET_PX = SCROLL_BUTTON_OFFSET_PX;
  const DOWNLOAD_BUTTON_TOP_OFFSET_PX =
    SEARCH_BUTTON_TOP_OFFSET_PX +
    SEARCH_BUTTON_SIZE_PX +
    SEARCH_BUTTON_GAP_PX;
  const SCROLL_BUTTON_TOP_OFFSET_PX =
    DOWNLOAD_BUTTON_TOP_OFFSET_PX +
    DOWNLOAD_BUTTON_SIZE_PX +
    DOWNLOAD_BUTTON_GAP_PX;
  const TOKEN_GAUGE_MAX_TOKENS = 128000;
  const TOKEN_GAUGE_YELLOW_RATIO = 0.25;
  const TOKEN_GAUGE_RED_RATIO = 0.65;
  const ARTICLE_SNIPPET_LENGTH = 120;
  const SEARCH_PANEL_RIGHT_OFFSET_PX =
    SEARCH_BUTTON_RIGHT_OFFSET_PX + SEARCH_BUTTON_SIZE_PX + SEARCH_BUTTON_GAP_PX;
  const SEARCH_PANEL_TOP_OFFSET_PX = SEARCH_BUTTON_TOP_OFFSET_PX;
  const SEARCH_PANEL_WIDTH_PX = 280;
  const SEARCH_DEBOUNCE_MS = 200;
  const MESSAGE_RAIL_OUTSIDE_LEFT_PX = -32;
  const MESSAGE_RAIL_INSIDE_LEFT_PX = 6;
  const MESSAGE_RAIL_INSIDE_PADDING_PX = 34;
  const MESSAGE_RAIL_LEFT_GUTTER_THRESHOLD_PX = 72;
  const SIDEBAR_TOGGLE_SIZE_PX = 30;
  const SIDEBAR_TOGGLE_RIGHT_OFFSET_PX = SCROLL_BUTTON_OFFSET_PX;
  const SIDEBAR_TOGGLE_TOP_OFFSET_PX = MINIMAP_BUTTON_TOP_OFFSET_PX;
  const SIDEBAR_PANEL_WIDTH_PX = 380;
  const DEFAULT_CONVERSATION_PADDING_PX = DEFAULT_EXTENSION_SETTINGS.conversationPaddingPx;
  const DEFAULT_COMPOSER_WIDTH_PX = DEFAULT_EXTENSION_SETTINGS.composerWidthPx;
  const DEFAULT_SIDEBAR_HOTKEY = DEFAULT_EXTENSION_SETTINGS.sidebarHotkey;
  const DEFAULT_ROLE_COLORS = {
    userDark: DEFAULT_EXTENSION_SETTINGS.userColorDark,
    assistantDark: DEFAULT_EXTENSION_SETTINGS.assistantColorDark,
    userLight: DEFAULT_EXTENSION_SETTINGS.userColorLight,
    assistantLight: DEFAULT_EXTENSION_SETTINGS.assistantColorLight
  };
  let uiSettings = {
    sidebarWidthPx: SIDEBAR_PANEL_WIDTH_PX,
    minimapVisible: true,
    sidebarHotkey: DEFAULT_SIDEBAR_HOTKEY,
    conversationPaddingPx: DEFAULT_CONVERSATION_PADDING_PX,
    composerWidthPx: DEFAULT_COMPOSER_WIDTH_PX,
    userColorDark: DEFAULT_ROLE_COLORS.userDark,
    assistantColorDark: DEFAULT_ROLE_COLORS.assistantDark,
    userColorLight: DEFAULT_ROLE_COLORS.userLight,
    assistantColorLight: DEFAULT_ROLE_COLORS.assistantLight
  };
  let currentSidebarWidthPx = SIDEBAR_PANEL_WIDTH_PX;
  const SIDEBAR_TRANSITION_MS = 300;
  const SIDEBAR_MAP_TRACK_HEIGHT_PX = 300;
  const SIDEBAR_MAP_SNIPPET_LENGTH = 180;
  const SIDEBAR_MAP_NEARBY_RADIUS = 3;
  const SIDEBAR_SNIPPET_MAX_HEIGHT_PX = 420;


  const ARTICLE_HOVER_HIGHLIGHT_SHADOW = "0 0 0 1px rgba(59,130,246,0.32)";

  const searchRefs = {};
  Object.defineProperties(searchRefs, {
    searchButton: { get: () => searchButton, set: (value) => { searchButton = value; } },
    searchPanel: { get: () => searchPanel, set: (value) => { searchPanel = value; } },
    searchInput: { get: () => searchInput, set: (value) => { searchInput = value; } },
    searchPrevButton: { get: () => searchPrevButton, set: (value) => { searchPrevButton = value; } },
    searchNextButton: { get: () => searchNextButton, set: (value) => { searchNextButton = value; } },
    searchCountLabel: { get: () => searchCountLabel, set: (value) => { searchCountLabel = value; } },
    searchCountPrimaryLabel: { get: () => searchCountPrimaryLabel, set: (value) => { searchCountPrimaryLabel = value; } },
    searchCountSecondaryLabel: { get: () => searchCountSecondaryLabel, set: (value) => { searchCountSecondaryLabel = value; } },
    searchCloseButton: { get: () => searchCloseButton, set: (value) => { searchCloseButton = value; } },
    searchDebounceTimer: { get: () => searchDebounceTimer, set: (value) => { searchDebounceTimer = value; } },
    highlightedSearchElement: { get: () => highlightedSearchElement, set: (value) => { highlightedSearchElement = value; } }
  });

  const minimapRefs = {};
  Object.defineProperties(minimapRefs, {
    minimapButton: { get: () => minimapButton, set: (value) => { minimapButton = value; } },
    minimapPanel: { get: () => minimapPanel, set: (value) => { minimapPanel = value; } },
    activeStandaloneMinimapVirtualId: {
      get: () => activeStandaloneMinimapVirtualId,
      set: (value) => { activeStandaloneMinimapVirtualId = value; }
    }
  });
  const mapRefs = {};
  Object.defineProperties(mapRefs, {
    activeMapVirtualId: {
      get: () => activeMapVirtualId,
      set: (value) => { activeMapVirtualId = value; }
    }
  });

  const searchFeature = createSearchFeature({
    refs: searchRefs,
    searchState,
    state,
    constants: {
      articleSnippetLength: ARTICLE_SNIPPET_LENGTH,
      searchDebounceMs: SEARCH_DEBOUNCE_MS,
      searchButtonSizePx: SEARCH_BUTTON_SIZE_PX,
      searchButtonRightOffsetPx: SEARCH_BUTTON_RIGHT_OFFSET_PX,
      searchButtonTopOffsetPx: SEARCH_BUTTON_TOP_OFFSET_PX,
      searchPanelTopOffsetPx: SEARCH_PANEL_TOP_OFFSET_PX,
      searchPanelRightOffsetPx: SEARCH_PANEL_RIGHT_OFFSET_PX,
      searchPanelWidthPx: SEARCH_PANEL_WIDTH_PX
    },
    deps: {
      ensureVirtualIds,
      getActiveConversationNodes,
      getMessageRole,
      getRoleSurfaceStyle,
      createRoleChip,
      styleSearchButton,
      scrollToVirtualId,
      openSidebar,
      isSidebarOpen,
      getActiveSidebarTab: () => activeSidebarTab,
      getSidebarContentContainer: () => sidebarContentContainer,
      renderSidebarTab,
      refreshSidebarTab,
      updateSidebarVisibility,
      applyFloatingUiOffsets,
      applyThemeToUi,
      getThemeTokens,
      escapeSelectorValue
    }
  });

  const mapFeature = createMapFeature({
    refs: mapRefs,
    state,
    constants: {
      articleSnippetLength: ARTICLE_SNIPPET_LENGTH,
      sidebarMapSnippetLength: SIDEBAR_MAP_SNIPPET_LENGTH,
      sidebarMapNearbyRadius: SIDEBAR_MAP_NEARBY_RADIUS,
      sidebarMapTrackHeightPx: SIDEBAR_MAP_TRACK_HEIGHT_PX
    },
    deps: {
      getViewportMetrics,
      getThemeTokens,
      getMessageRole,
      getRoleSurfaceStyle,
      createRoleChip,
      getRoleDisplayLabel,
      ensureVirtualIds,
      scrollToVirtualId,
      isSidebarOpen,
      getActiveSidebarTab: () => activeSidebarTab,
      getSidebarContentContainer: () => sidebarContentContainer,
      escapeSelectorValue
    }
  });

  const minimapFeature = createMinimapFeature({
    refs: minimapRefs,
    state,
    constants: {
      scrollButtonSizePx: SCROLL_BUTTON_SIZE_PX,
      minimapButtonGapPx: MINIMAP_BUTTON_GAP_PX,
      minimapButtonSizePx: MINIMAP_BUTTON_SIZE_PX,
      minimapButtonRightOffsetPx: MINIMAP_BUTTON_RIGHT_OFFSET_PX,
      minimapButtonTopOffsetPx: MINIMAP_BUTTON_TOP_OFFSET_PX,
      minimapPanelRightOffsetPx: MINIMAP_PANEL_RIGHT_OFFSET_PX,
      minimapPanelTopOffsetPx: MINIMAP_PANEL_TOP_OFFSET_PX,
      minimapPanelWidthPx: MINIMAP_PANEL_WIDTH_PX,
      minimapTrackHeightPx: MINIMAP_TRACK_HEIGHT_PX
    },
    getUiSettings: () => uiSettings,
    deps: {
      ensureVirtualIds,
      getMessageRole,
      styleSearchButton,
      getThemeMode,
      getThemeTokens,
      escapeSelectorValue,
      getViewportAnchorVirtualId,
      getScrollTarget,
      getMaxScrollTop,
      scrollToVirtualId,
      applyFloatingUiOffsets,
      applyThemeToUi
    }
  });

  function syncFlagsFromPersistedKeys() {
    const nextPinned = new Set();
    const nextBookmarked = new Set();

    state.articleMap.forEach((article, virtualId) => {
      if (!(article instanceof HTMLElement)) return;
      const key = getArticleMessageKey(article, virtualId);
      if (persistedPinnedMessageKeys.has(key)) nextPinned.add(virtualId);
      if (persistedBookmarkedMessageKeys.has(key)) nextBookmarked.add(virtualId);
    });

    const prevPinned = state.pinnedMessages;
    const prevBookmarked = state.bookmarkedMessages;
    const flagsChanged =
      prevPinned.size !== nextPinned.size ||
      prevBookmarked.size !== nextBookmarked.size ||
      Array.from(nextPinned).some((id) => !prevPinned.has(id)) ||
      Array.from(nextBookmarked).some((id) => !prevBookmarked.has(id));

    state.pinnedMessages = nextPinned;
    state.bookmarkedMessages = nextBookmarked;
    updatePinnedBar();
    if (bookmarksPanel && bookmarksPanel.style.display !== "none") {
      populateBookmarksPanel(bookmarksPanel);
    }
    state.articleMap.forEach((article, virtualId) => {
      updatePinButtonAppearance(article, virtualId);
      updateBookmarkButtonAppearance(article, virtualId);
    });
    if (flagsChanged) refreshSidebarTab();
  }

  // ---------------------------------------------------------------------------
  // Selectors
  // ---------------------------------------------------------------------------

  function collectSidebarLayoutTargets() {
    const targets = [];

    // Primary layout owner in ChatGPT is usually the detected scroll container.
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

    const filtered = targets.filter((el) => {
      if (!(el instanceof HTMLElement) || !el.isConnected) return false;
      if (sidebarPanel && sidebarPanel.contains(el)) return false;
      return !targets.some((other) => other !== el && other instanceof HTMLElement && other.contains(el));
    });
    return filtered;
  }

  function isSidebarOpen() {
    return !!(sidebarPanel && sidebarPanel.getAttribute("data-open") === "true");
  }

  function getSidebarUiOffsetPx() {
    return isSidebarOpen() ? currentSidebarWidthPx : 0;
  }

  function applyFloatingUiOffsets() {
    const offset = getSidebarUiOffsetPx();

    if (indicatorElement) indicatorElement.style.right = `${INDICATOR_RIGHT_OFFSET_PX + offset}px`;

    // Dynamically stack the right-side floating buttons so there are no empty gaps
    // if conditional buttons (like bookmarks) are hidden.
    let currentTop = SIDEBAR_TOGGLE_TOP_OFFSET_PX;

    if (sidebarToggleButton && sidebarToggleButton.style.display !== "none") {
      sidebarToggleButton.style.top = `${currentTop}px`;
      sidebarToggleButton.style.right = `${SIDEBAR_TOGGLE_RIGHT_OFFSET_PX + offset}px`;
      currentTop += SIDEBAR_TOGGLE_SIZE_PX + SEARCH_BUTTON_GAP_PX;
    }

    if (searchButton && searchButton.style.display !== "none") {
      searchButton.style.top = `${currentTop}px`;
      searchButton.style.right = `${SEARCH_BUTTON_RIGHT_OFFSET_PX + offset}px`;
      if (searchPanel) searchPanel.style.top = `${currentTop}px`;
      if (searchPanel) searchPanel.style.right = `${SEARCH_PANEL_RIGHT_OFFSET_PX + offset}px`;
      currentTop += SEARCH_BUTTON_SIZE_PX + SEARCH_BUTTON_GAP_PX;
    }

    if (downloadButton && downloadButton.style.display !== "none") {
      downloadButton.style.top = `${currentTop}px`;
      downloadButton.style.right = `${DOWNLOAD_BUTTON_RIGHT_OFFSET_PX + offset}px`;
      currentTop += DOWNLOAD_BUTTON_SIZE_PX + DOWNLOAD_BUTTON_GAP_PX;
    }

    if (bookmarksButton && bookmarksButton.style.display !== "none") {
      bookmarksButton.style.top = `${currentTop}px`;
      bookmarksButton.style.right = `${BOOKMARKS_BUTTON_RIGHT_OFFSET_PX + offset}px`;
      if (bookmarksPanel) bookmarksPanel.style.top = `${currentTop}px`;
      if (bookmarksPanel) bookmarksPanel.style.right = `${BOOKMARKS_PANEL_RIGHT_OFFSET_PX + offset}px`;
      currentTop += BOOKMARKS_BUTTON_SIZE_PX + BOOKMARKS_BUTTON_GAP_PX;
    }

    if (scrollToTopButton && scrollToTopButton.style.display !== "none") {
      scrollToTopButton.style.top = `${currentTop}px`;
      scrollToTopButton.style.right = `${SCROLL_BUTTON_OFFSET_PX + offset}px`;
    }

    // Scroll to bottom stays anchored to the bottom
    if (scrollToBottomButton) scrollToBottomButton.style.right = `${SCROLL_BUTTON_OFFSET_PX + offset}px`;

    if (minimapPanel) {
      const topButtonTop = scrollToTopButton && scrollToTopButton.style.top
        ? parseFloat(scrollToTopButton.style.top) || SCROLL_BUTTON_TOP_OFFSET_PX
        : SCROLL_BUTTON_TOP_OFFSET_PX;
      const bottomButtonTop = window.innerHeight - SCROLL_BUTTON_OFFSET_PX - SCROLL_BUTTON_SIZE_PX;
      minimapFeature.applyFloatingLayout(offset, topButtonTop, bottomButtonTop);
    }
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

  function applySidebarLayoutOffset(offsetPx, transitionMs = SIDEBAR_TRANSITION_MS) {
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
        const isRootContainer = el === document.documentElement || el === document.body || el.tagName.toLowerCase() === "main";
        const isScrollOwner = el === state.scrollElement;
        if (isRootContainer || isScrollOwner) {
          // Push native scrollbar inwards instead of burying it under padding
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



  // ---------------------------------------------------------------------------
  // Core virtualization helpers
  // ---------------------------------------------------------------------------

  /**
   * Assign virtual IDs to visible <article> messages.
   */
  function ensureVirtualIds() {
    const articleList = getActiveConversationNodes();

    articleList.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;

      if (!node.dataset.virtualId) {
        const newId = String(state.nextVirtualId++);
        node.dataset.virtualId = newId;
        state.articleMap.set(newId, node);
        getArticleMessageKey(node, newId);
        injectArticleUi(node, newId);
      } else {
        const id = node.dataset.virtualId;
        if (id && !state.articleMap.has(id)) {
          state.articleMap.set(id, node);
          getArticleMessageKey(node, id);
          injectArticleUi(node, id);
        }
      }
    });
    syncFlagsFromPersistedKeys();
  }

  /**
   * Get viewport position/height for the scroll container.
   */
  function getViewportMetrics() {
    const scrollElement = state.scrollElement;

    if (
      scrollElement &&
      scrollElement !== document.body &&
      scrollElement !== document.documentElement &&
      scrollElement !== window &&
      scrollElement instanceof HTMLElement
    ) {
      const rect = scrollElement.getBoundingClientRect();
      const containerHeight = scrollElement.clientHeight;

      if (containerHeight > 0) {
        return { top: rect.top, height: containerHeight };
      }
    }

    return { top: 0, height: window.innerHeight };
  }

  function scheduleDeferredVirtualization() {
    if (deferredVirtualizationTimer !== null) return false;
    deferredVirtualizationTimer = setTimeout(() => {
      deferredVirtualizationTimer = null;
      scheduleVirtualization();
    }, DEFERRED_VIRTUALIZATION_DELAY_MS);
    return true;
  }

  function queueDeferredVirtualizationRetry() {
    if (state.emptyVirtualizationRetryCount >= MAX_EMPTY_RETRY_COUNT) return;
    if (scheduleDeferredVirtualization()) {
      state.emptyVirtualizationRetryCount += 1;
    }
  }

  function getScrollTarget() {
    const scrollElement = state.scrollElement;

    if (
      scrollElement === window ||
      scrollElement === document.body ||
      scrollElement === document.documentElement
    ) {
      return document.scrollingElement || document.documentElement;
    }

    return scrollElement instanceof HTMLElement ? scrollElement : null;
  }

  function getMaxScrollTop(scrollTarget) {
    if (!scrollTarget) return 0;
    return Math.max(0, scrollTarget.scrollHeight - scrollTarget.clientHeight);
  }

  function isScrollable(scrollTarget) {
    if (!scrollTarget) return false;
    return getMaxScrollTop(scrollTarget) >= SCROLL_BUFFER_PX;
  }

  function ensureIndicatorElement() {
    if (indicatorElement && indicatorElement.isConnected) {
      return indicatorElement;
    }

    const element = document.createElement("div");
    const theme = getThemeTokens();
    const userRoleStyle = getRoleSurfaceStyle("user", theme);
    element.setAttribute("data-chatgpt-virtual-indicator", "1");
    element.style.position = "fixed";
    element.style.right = `${INDICATOR_RIGHT_OFFSET_PX}px`;
    element.style.top = "50%";
    element.style.transform = "translateY(-50%)";
    element.style.zIndex = "10003";
    element.style.display = "none";
    element.style.width = "4px";
    element.style.height = `${INDICATOR_BASE_MIN_HEIGHT_PX}px`;
    element.style.borderRadius = "999px";
    element.style.background = userRoleStyle.accentColor;
    element.style.border = `1px solid ${userRoleStyle.borderColor}`;
    element.style.boxShadow = "0 4px 10px rgba(15, 23, 42, 0.18)";
    element.style.opacity = String(INDICATOR_MIN_OPACITY);
    element.style.pointerEvents = "none";
    element.style.userSelect = "none";
    element.setAttribute("aria-label", "Virtualizing messages");
    document.body.appendChild(element);
    indicatorElement = element;
    applyFloatingUiOffsets();
    applyThemeToUi();
    return element;
  }

  function hideIndicator() {
    if (indicatorElement) {
      indicatorElement.style.display = "none";
    }
  }

  function hideAllUiElements() {
    hideIndicator();
    hideScrollButtons();
    hideSearchUi();
    hideMinimapUi();
    hideCodePanelUi();
    hideBookmarksUi();
    hideSidebar();
    if (downloadButton) downloadButton.style.display = "none";
  }

  function setButtonVisibility(button, shouldShow) {
    if (!button) return;
    button.style.display = shouldShow ? "flex" : "none";
  }

  function scrollToEdge(position) {
    const attemptScroll = (attempt) => {
      const scrollTarget = getScrollTarget();
      if (!scrollTarget) return;

      const maxScrollTop = getMaxScrollTop(scrollTarget);
      const targetTop = position === "top" ? 0 : maxScrollTop;
      scrollTarget.scrollTo({ top: targetTop, behavior: "smooth" });

      if (attempt < MAX_SCROLL_ATTEMPTS) {
        setTimeout(() => {
          const updatedTarget = getScrollTarget();
          if (!updatedTarget) return;
          const updatedMax = getMaxScrollTop(updatedTarget);
          const atEdge =
            position === "top"
              ? updatedTarget.scrollTop <= SCROLL_BUFFER_PX
              : updatedTarget.scrollTop >= updatedMax - SCROLL_BUFFER_PX;

          if (!atEdge) attemptScroll(attempt + 1);
        }, SCROLL_RETRY_DELAY_MS);
      }
    };

    attemptScroll(0);
  }

  function ensureScrollButton(position) {
    const existingButton = position === "top" ? scrollToTopButton : scrollToBottomButton;
    if (existingButton && existingButton.isConnected) {
      return existingButton;
    }

    if (!document.body) {
      return null;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-chatgpt-virtual-scroll", position);
    button.style.position = "fixed";
    button.style.right = `${SCROLL_BUTTON_OFFSET_PX}px`;
    button.style.zIndex = "10002";
    button.style.width = `${SCROLL_BUTTON_SIZE_PX}px`;
    button.style.height = `${SCROLL_BUTTON_SIZE_PX}px`;
    button.style.borderRadius = "999px";
    button.style.border = "none";
    button.style.cursor = "pointer";
    button.style.background = "rgba(17, 24, 39, 0.7)";
    button.style.color = "#f9fafb";
    button.style.fontSize = "16px";
    button.style.fontWeight = "600";
    button.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";
    button.style.display = "none";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.padding = "0";

    if (position === "top") {
      button.style.top = `${SCROLL_BUTTON_TOP_OFFSET_PX}px`;
      button.textContent = "↑";
      button.setAttribute("aria-label", "Scroll to top");
    } else {
      button.style.bottom = `${SCROLL_BUTTON_OFFSET_PX}px`;
      button.textContent = "↓";
      button.setAttribute("aria-label", "Scroll to bottom");
    }

    button.addEventListener("click", () => {
      // Use latest scroll target in case the container changes.
      scrollToEdge(position);
    });

    document.body.appendChild(button);

    if (position === "top") {
      scrollToTopButton = button;
    } else {
      scrollToBottomButton = button;
    }

    applyFloatingUiOffsets();
    applyThemeToUi();
    return button;
  }

  function hideScrollButtons() {
    if (scrollToTopButton) scrollToTopButton.style.display = "none";
    if (scrollToBottomButton) scrollToBottomButton.style.display = "none";
  }

  function hideSearchUi() {
    searchFeature.hideSearchUi();
  }

  function updateScrollButtons(totalMessages) {
    if (!state.enabled) {
      hideScrollButtons();
      return;
    }

    // Prefer the established scroll element; fall back to candidates only
    // when it isn't set (e.g., early in page load before messages are found).
    let scrollTarget = getScrollTarget();

    if (!scrollTarget) {
      const candidates = [];
      if (state.scrollElement instanceof HTMLElement) candidates.push(state.scrollElement);
      const docFallback = document.scrollingElement || document.documentElement || document.body;
      if (docFallback) candidates.push(docFallback);

      let maxScrollable = 0;
      candidates.forEach((candidate) => {
        if (!candidate) return;
        const max = getMaxScrollTop(candidate);
        if (max > maxScrollable) {
          maxScrollable = max;
          scrollTarget = candidate;
        }
      });

      if (!scrollTarget || maxScrollable < SCROLL_BUFFER_PX) {
        hideScrollButtons();
        return;
      }
    } else {
      if (!isScrollable(scrollTarget)) {
        hideScrollButtons();
        return;
      }
    }

    const topButton = ensureScrollButton("top");
    const bottomButton = ensureScrollButton("bottom");

    const maxScrollTop = getMaxScrollTop(scrollTarget);
    setButtonVisibility(topButton, scrollTarget.scrollTop > SCROLL_BUFFER_PX);
    setButtonVisibility(
      bottomButton,
      scrollTarget.scrollTop < maxScrollTop - SCROLL_BUFFER_PX
    );
  }

  function applyThemeToUi() {
    const theme = getThemeTokens();

    if (indicatorElement) {
      const userRoleStyle = getRoleSurfaceStyle("user", theme);
      indicatorElement.style.background = userRoleStyle.accentColor;
      indicatorElement.style.boxShadow = theme.indicatorShadow;
      indicatorElement.style.border = `1px solid ${userRoleStyle.borderColor}`;
    }

    const buttons = [scrollToTopButton, scrollToBottomButton, searchButton, minimapButton,
      codePanelButton, downloadButton, bookmarksButton, sidebarToggleButton];
    buttons.forEach((button) => {
      if (!button) return;
      button.style.background = theme.buttonBg;
      button.style.color = theme.buttonText;
      button.style.boxShadow = theme.buttonShadow;
    });

    const minorButtons = [searchPrevButton, searchNextButton, searchCloseButton];
    minorButtons.forEach((button) => {
      if (!button) return;
      button.style.background = theme.buttonMutedBg;
      button.style.color = theme.buttonMutedText;
      button.style.border = `1px solid ${theme.panelBorder}`;
    });

    if (searchPanel) {
      searchPanel.style.background = theme.panelBg;
      searchPanel.style.boxShadow = theme.panelShadow;
      searchPanel.style.border = `1px solid ${theme.panelBorder}`;
      searchPanel.style.color = theme.text;
    }

    if (searchInput) {
      searchInput.style.background = theme.inputBg;
      searchInput.style.border = `1px solid ${theme.inputBorder}`;
      searchInput.style.color = theme.text;
      searchInput.style.caretColor = theme.text;
    }

    if (searchCountPrimaryLabel) {
      searchCountPrimaryLabel.style.color = theme.text;
    }
    if (searchCountSecondaryLabel) {
      searchCountSecondaryLabel.style.color = theme.mutedText;
    }

    if (minimapPanel) {
      minimapFeature.applyTheme(theme);
    }

    if (codePanelPanel) {
      codePanelPanel.style.background = theme.panelBg;
      codePanelPanel.style.boxShadow = theme.panelShadow;
      codePanelPanel.style.border = `1px solid ${theme.panelBorder}`;
      codePanelPanel.style.color = theme.text;
    }

    if (bookmarksPanel) {
      bookmarksPanel.style.background = theme.panelBg;
      bookmarksPanel.style.boxShadow = theme.panelShadow;
      bookmarksPanel.style.border = `1px solid ${theme.panelBorder}`;
      bookmarksPanel.style.color = theme.text;
    }

    if (sidebarPanel) {
      sidebarPanel.style.background = theme.panelBg;
      sidebarPanel.style.boxShadow = theme.panelShadow;
      sidebarPanel.style.border = `1px solid ${theme.panelBorder}`;
      sidebarPanel.style.color = theme.text;
    }

    if (pinnedBarElement) {
      pinnedBarElement.style.background = theme.panelBg;
      pinnedBarElement.style.borderBottom = `1px solid ${theme.panelBorder}`;
      pinnedBarElement.style.boxShadow = theme.panelShadow;
    }
  }

  function escapeSelectorValue(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(String(value));
    }
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function clearSearchTextHighlights(element) {
    searchFeature.clearSearchTextHighlights(element);
  }

  function clearSearchHighlight() {
    searchFeature.clearSearchHighlight();
  }

  function highlightMatchesInElement(element, query) {
    searchFeature.highlightMatchesInElement(element, query);
  }

  function setSearchHighlight(element) {
    searchFeature.setSearchHighlight(element);
  }

  function updateSearchCountLabel() {
    searchFeature.updateSearchCountLabel();
  }

  function collectSearchTargets() {
    return searchFeature.collectSearchTargets();
  }

  function getMessageTextSnippet(virtualId, maxLength = ARTICLE_SNIPPET_LENGTH) {
    return mapFeature.getMessageTextSnippet(virtualId, maxLength);
  }

  function getMessageRoleById(virtualId) {
    return mapFeature.getMessageRoleById(virtualId);
  }

  function getViewportAnchorVirtualId() {
    return mapFeature.getViewportAnchorVirtualId();
  }

  function applyMapMarkerStyle(marker, isActive) {
    mapFeature.applyMapMarkerStyle(marker, isActive);
  }

  function applyMapNearbyItemStyle(item, isActive) {
    mapFeature.applyMapNearbyItemStyle(item, isActive);
  }

  function populateMapNearbyList(listContainer, track, activeId) {
    mapFeature.populateMapNearbyList(listContainer, track, activeId);
  }

  function updateMapViewportState(force = false) {
    mapFeature.updateMapViewportState(force);
  }

  function getSearchResultSummary(id, index, total) {
    return searchFeature.getSearchResultSummary(id, index, total);
  }

  function focusSearchResult(id) {
    searchFeature.focusSearchResult(id);
  }

  function rerenderSearchSidebarPreservingInputFocus() {
    searchFeature.rerenderSearchSidebarPreservingInputFocus();
  }

  function runSearch(query) {
    searchFeature.runSearch(query);
  }

  function scheduleSearch(query) {
    searchFeature.scheduleSearch(query);
  }

  function ensureSearchResultsFresh() {
    searchFeature.ensureSearchResultsFresh();
  }

  function navigateSearch(direction) {
    searchFeature.navigateSearch(direction);
  }

  function showSearchPanel() {
    searchFeature.showSearchPanel();
  }

  function hideSearchPanel() {
    searchFeature.hideSearchPanel();
  }

  function toggleSearchPanel() {
    searchFeature.toggleSearchPanel();
  }

  function styleSearchButton(button, sizePx) {
    button.style.width = `${sizePx}px`;
    button.style.height = `${sizePx}px`;
    button.style.borderRadius = "999px";
    button.style.border = "none";
    button.style.cursor = "pointer";
    button.style.background = "rgba(17, 24, 39, 0.75)";
    button.style.color = "#f9fafb";
    button.style.fontSize = "12px";
    button.style.fontWeight = "600";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.padding = "0";
  }

  function normalizeMargin(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return config.DEFAULT_MARGIN_PX;
    return Math.min(config.MAX_MARGIN_PX, Math.max(config.MIN_MARGIN_PX, Math.round(parsed)));
  }

  function ensureConversationLayoutStyleElement() {
    if (conversationLayoutStyleElement && conversationLayoutStyleElement.isConnected) {
      return conversationLayoutStyleElement;
    }
    const style = document.createElement("style");
    style.id = "gpt-boost-layout-settings";
    document.head.appendChild(style);
    conversationLayoutStyleElement = style;
    return style;
  }

  function applyRoleColorSettings() {
    const rootStyle = document.documentElement && document.documentElement.style;
    if (!rootStyle) return;
    rootStyle.setProperty("--gpt-boost-user-dark", uiSettings.userColorDark || DEFAULT_ROLE_COLORS.userDark);
    rootStyle.setProperty("--gpt-boost-assistant-dark", uiSettings.assistantColorDark || DEFAULT_ROLE_COLORS.assistantDark);
    rootStyle.setProperty("--gpt-boost-user-light", uiSettings.userColorLight || DEFAULT_ROLE_COLORS.userLight);
    rootStyle.setProperty("--gpt-boost-assistant-light", uiSettings.assistantColorLight || DEFAULT_ROLE_COLORS.assistantLight);
  }

  function applyConversationLayoutSettings() {
    const styleEl = ensureConversationLayoutStyleElement();
    styleEl.textContent = `
      .composer-parent {
        --composer-bar_current-width: ${uiSettings.composerWidthPx}px !important;
        --composer-bar_width: ${uiSettings.composerWidthPx}px !important;
      }
      [class*="thread-content-margin"] {
        --thread-content-margin: ${uiSettings.conversationPaddingPx}px !important;
      }
      [class*="thread-content-max-width"] {
        --thread-content-max-width: ${uiSettings.composerWidthPx}px !important;
      }
    `;

    const composerWidthValue = `${uiSettings.composerWidthPx}px`;
    const conversationPaddingValue = `${uiSettings.conversationPaddingPx}px`;
    document.querySelectorAll(".composer-parent").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.style.setProperty("--composer-bar_current-width", composerWidthValue, "important");
      node.style.setProperty("--composer-bar_width", composerWidthValue, "important");
    });
    document.querySelectorAll('[class*="thread-content-margin"]').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.style.setProperty("--thread-content-margin", conversationPaddingValue, "important");
    });
    document.querySelectorAll('[class*="thread-content-max-width"]').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.style.setProperty("--thread-content-max-width", composerWidthValue, "important");
    });
  }

  function applyUiSettings(nextSettings = {}) {
    uiSettings = normalizeExtensionSettings(
      {
        ...uiSettings,
        ...nextSettings
      },
      {
        minMarginPx: config.MIN_MARGIN_PX,
        maxMarginPx: config.MAX_MARGIN_PX,
        defaultMarginPx: config.DEFAULT_MARGIN_PX
      }
    );

    currentSidebarWidthPx = uiSettings.sidebarWidthPx;
    if (sidebarPanel && sidebarPanel.isConnected) {
      sidebarPanel.style.width = `${currentSidebarWidthPx}px`;
    }
    if (isSidebarOpen()) {
      applySidebarLayoutOffset(currentSidebarWidthPx, 0);
    }
    applyRoleColorSettings();
    applyConversationLayoutSettings();
    updateMinimapVisibility(state.stats.totalMessages);
    applyFloatingUiOffsets();
    if (activeSidebarTab === "settings") {
      refreshSidebarTab();
    }
  }

  function refreshSidebarTab() {
    if (!sidebarContentContainer || !sidebarPanel || !isSidebarOpen()) return;
    renderSidebarTab(activeSidebarTab);
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

  function renderSearchTabContent(container) {
    searchFeature.renderSearchTabContent(container);
  }

  function renderBookmarksTabContent(container) {
    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "2px";
    list.style.overflowY = "auto";
    list.style.minHeight = "0";
    list.style.flex = "1";
    list.setAttribute("data-chatgpt-bookmarks", "list");
    container.appendChild(list);
    populateBookmarksPanel(container);
  }

  function renderMapTabContent(container) {
    mapFeature.renderMapTabContent(container);
  }

  function collapseAllMessages() {
    ensureVirtualIds();
    state.articleMap.forEach((_article, id) => state.collapsedMessages.add(id));
    state.articleMap.forEach((article, id) => applyCollapseState(article, id));
  }

  function expandAllMessages() {
    ensureVirtualIds();
    state.collapsedMessages.clear();
    state.articleMap.forEach((article, id) => applyCollapseState(article, id));
  }

  function renderOutlineTabContent(container) {
    const theme = getThemeTokens();
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "6px";
    controls.style.marginBottom = "8px";

    const collapseAllBtn = document.createElement("button");
    collapseAllBtn.type = "button";
    collapseAllBtn.textContent = "Collapse All";
    collapseAllBtn.style.padding = "4px 8px";
    collapseAllBtn.style.fontSize = "11px";
    collapseAllBtn.style.border = "none";
    collapseAllBtn.style.borderRadius = "8px";
    collapseAllBtn.style.cursor = "pointer";
    collapseAllBtn.style.background = theme.buttonMutedBg;
    collapseAllBtn.style.color = theme.buttonMutedText;
    collapseAllBtn.addEventListener("click", () => {
      collapseAllMessages();
      renderSidebarTab("outline");
    });

    const expandAllBtn = document.createElement("button");
    expandAllBtn.type = "button";
    expandAllBtn.textContent = "Expand All";
    expandAllBtn.style.padding = "4px 8px";
    expandAllBtn.style.fontSize = "11px";
    expandAllBtn.style.border = "none";
    expandAllBtn.style.borderRadius = "8px";
    expandAllBtn.style.cursor = "pointer";
    expandAllBtn.style.background = theme.buttonMutedBg;
    expandAllBtn.style.color = theme.buttonMutedText;
    expandAllBtn.addEventListener("click", () => {
      expandAllMessages();
      renderSidebarTab("outline");
    });

    controls.appendChild(collapseAllBtn);
    controls.appendChild(expandAllBtn);
    container.appendChild(controls);

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "6px";
    list.style.overflowY = "auto";
    list.style.minHeight = "0";
    list.style.flex = "1";
    container.appendChild(list);

    const entries = Array.from(state.articleMap.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
    entries.forEach(([id, article], index) => {
      if (!(article instanceof HTMLElement)) return;
      const textSource = article.querySelector("[data-message-author-role]") || article;
      const text = (textSource.textContent || "").trim().replace(/\s+/g, " ");
      if (!text) return;
      const role = getMessageRole(article);
      const roleStyle = getRoleSurfaceStyle(role, theme);

      const item = document.createElement("div");
      item.style.border = `1px solid ${roleStyle.borderColor}`;
      item.style.borderLeft = `3px solid ${roleStyle.accentColor}`;
      item.style.borderRadius = "10px";
      item.style.padding = "6px 8px";
      item.style.display = "flex";
      item.style.flexShrink = "0";
      item.style.flexDirection = "column";
      item.style.gap = "6px";
      item.style.background = roleStyle.surfaceBg;
      item.style.width = "100%";

      const roleChip = createRoleChip(roleStyle);

      const title = document.createElement("button");
      title.type = "button";
      title.textContent = `${index + 1}. ${text.slice(0, 90)}${text.length > 90 ? "…" : ""}`;
      title.style.textAlign = "left";
      title.style.border = "none";
      title.style.background = "transparent";
      title.style.padding = "0";
      title.style.cursor = "pointer";
      title.style.fontSize = "12px";
      title.style.color = theme.text;
      title.style.fontFamily = "inherit";
      title.addEventListener("click", () => scrollToVirtualId(id));

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";

      const mkBtn = (label, onClick) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.style.border = "none";
        b.style.borderRadius = "6px";
        b.style.padding = "2px 6px";
        b.style.fontSize = "10px";
        b.style.cursor = "pointer";
        b.style.background = theme.buttonMutedBg;
        b.style.color = theme.buttonMutedText;
        b.addEventListener("click", onClick);
        return b;
      };

      actions.appendChild(mkBtn(state.pinnedMessages.has(id) ? "Unpin" : "Pin", () => {
        togglePin(id);
        renderSidebarTab("outline");
      }));
      actions.appendChild(mkBtn(state.bookmarkedMessages.has(id) ? "Unbookmark" : "Bookmark", () => {
        toggleBookmark(id);
        renderSidebarTab("outline");
      }));
      actions.appendChild(mkBtn(state.collapsedMessages.has(id) ? "Expand" : "Collapse", () => {
        toggleCollapse(id);
        renderSidebarTab("outline");
      }));

      item.appendChild(roleChip);
      item.appendChild(title);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  function renderSettingsTabContent(container) {
    renderSidebarSettingsTab({
      container,
      storage: getSettingsStorageArea(),
      theme: getThemeTokens(),
      state,
      config,
      uiSettings,
      defaults: {
        sidebarHotkey: DEFAULT_SIDEBAR_HOTKEY,
        conversationPaddingPx: DEFAULT_CONVERSATION_PADDING_PX,
        composerWidthPx: DEFAULT_COMPOSER_WIDTH_PX,
        sidebarPanelWidthPx: SIDEBAR_PANEL_WIDTH_PX,
        roleColors: DEFAULT_ROLE_COLORS
      },
      constants: {
        sidebarWidthMinPx: SIDEBAR_WIDTH_MIN_PX,
        sidebarWidthMaxPx: SIDEBAR_WIDTH_MAX_PX,
        conversationPaddingMinPx: CONVERSATION_PADDING_MIN_PX,
        conversationPaddingMaxPx: CONVERSATION_PADDING_MAX_PX,
        composerWidthMinPx: COMPOSER_WIDTH_MIN_PX,
        composerWidthMaxPx: COMPOSER_WIDTH_MAX_PX,
        scrollThrottleMinMs: SCROLL_THROTTLE_MIN_MS,
        scrollThrottleMaxMs: SCROLL_THROTTLE_MAX_MS,
        mutationDebounceMinMs: MUTATION_DEBOUNCE_MIN_MS,
        mutationDebounceMaxMs: MUTATION_DEBOUNCE_MAX_MS
      },
      helpers: {
        normalizeMargin,
        normalizeSidebarWidthPx,
        normalizeConversationPaddingPx,
        normalizeComposerWidthPx,
        normalizeScrollThrottleMs,
        normalizeMutationDebounceMs,
        normalizeSidebarHotkey,
        normalizeColorHex
      },
      callbacks: {
        applyUiSettings,
        scheduleVirtualization,
        updateSearchVisibility,
        updateSidebarVisibility,
        getStatsSnapshot,
        loadFlagsStore,
        loadKnownConversationsStore,
        summarizeConversationCaches,
        currentConversationKey,
        rerenderSettings: () => renderSidebarTab("settings")
      }
    });
  }

  function renderSidebarTab(tabId) {
    if (!sidebarContentContainer) return;
    activeSidebarTab = tabId;
    sidebarContentContainer.innerHTML = "";

    const tabs = sidebarPanel ? sidebarPanel.querySelectorAll("[data-gpt-boost-sidebar-tab]") : [];
    tabs.forEach((tab) => {
      if (!(tab instanceof HTMLElement)) return;
      const isActive = tab.dataset.gptBoostSidebarTab === tabId;
      tab.style.opacity = isActive ? "1" : "0.72";
      tab.style.background = "transparent";
      tab.style.borderRadius = "0";
      tab.style.padding = "4px 0";
      tab.style.borderBottom = isActive ? `2px solid ${getThemeTokens().text}` : "2px solid transparent";
    });

    if (tabId === "search") renderSearchTabContent(sidebarContentContainer);
    else if (tabId === "bookmarks") renderBookmarksTabContent(sidebarContentContainer);
    else if (tabId === "map") renderMapTabContent(sidebarContentContainer);
    else if (tabId === "outline") renderOutlineTabContent(sidebarContentContainer);
    else if (tabId === "snippets") renderSnippetsTabContent(sidebarContentContainer);
    else renderSettingsTabContent(sidebarContentContainer);

    if (tabId === "map") {
      updateMapViewportState(true);
    }
  }

  function hideSidebar() {
    if (sidebarPanel) {
      sidebarPanel.setAttribute("data-open", "false");
      sidebarPanel.style.transform = "translateX(100%)";
    }
    applySidebarLayoutOffset(0);
    applyFloatingUiOffsets();
    refreshArticleSideRailLayout();
    clearSearchHighlight();
  }

  function openSidebar(tabId) {
    const panel = ensureSidebarPanel();
    if (!panel) return;
    const wasOpen = panel.getAttribute("data-open") === "true";
    hideSearchPanel();
    if (!wasOpen) {
      applySidebarLayoutOffset(currentSidebarWidthPx);
    }
    panel.setAttribute("data-open", "true");
    panel.style.transform = "translateX(0px)";
    applyFloatingUiOffsets();
    if (!wasOpen) refreshArticleSideRailLayout();
    renderSidebarTab(tabId || activeSidebarTab);
    applyThemeToUi();
  }

  function toggleSidebar(tabId) {
    const panel = ensureSidebarPanel();
    if (!panel) return;
    const requested = tabId || activeSidebarTab;
    if (isSidebarOpen() && requested === activeSidebarTab) {
      hideSidebar();
      return;
    }
    openSidebar(requested);
  }

  function bindSidebarHotkey() {
    if (hotkeyListenerBound) return;
    window.addEventListener("keydown", (event) => {
      if (!state.enabled) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      if (!hotkeyMatchesKeyboardEvent(uiSettings.sidebarHotkey, event)) return;
      event.preventDefault();
      toggleSidebar(activeSidebarTab || "search");
    });
    hotkeyListenerBound = true;
  }

  function ensureSidebarToggleButton() {
    if (sidebarToggleButton && sidebarToggleButton.isConnected) return sidebarToggleButton;
    if (!document.body) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Open tools sidebar");
    button.style.position = "fixed";
    button.style.right = `${SIDEBAR_TOGGLE_RIGHT_OFFSET_PX}px`;
    button.style.top = `${SIDEBAR_TOGGLE_TOP_OFFSET_PX}px`;
    button.style.zIndex = "10002";
    button.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";
    styleSearchButton(button, SIDEBAR_TOGGLE_SIZE_PX);
    button.style.display = "none";
    button.textContent = "☰";
    button.addEventListener("click", () => toggleSidebar(activeSidebarTab));

    document.body.appendChild(button);
    sidebarToggleButton = button;
    applyFloatingUiOffsets();
    return button;
  }

  function ensureSidebarPanel() {
    if (sidebarPanel && sidebarPanel.isConnected) return sidebarPanel;
    if (!document.body) return null;
    const theme = getThemeTokens();

    const panel = document.createElement("div");
    panel.setAttribute("data-gpt-boost-sidebar", "panel");
    panel.setAttribute("data-open", "false");
    panel.style.position = "fixed";
    panel.style.top = "0";
    panel.style.right = "0";
    panel.style.bottom = "0";
    panel.style.zIndex = "10000";
    panel.style.width = `${currentSidebarWidthPx}px`;
    panel.style.display = "flex";
    panel.style.transform = "translateX(100%)";
    panel.style.transition = `transform ${SIDEBAR_TRANSITION_MS}ms ease`;
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
    resizer.addEventListener("mousedown", (e) => {
      isResizing = true;
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 200 && newWidth < window.innerWidth - 100) {
        currentSidebarWidthPx = newWidth;
        panel.style.width = `${currentSidebarWidthPx}px`;
        if (isSidebarOpen()) {
          applySidebarLayoutOffset(currentSidebarWidthPx, 0);
          applyFloatingUiOffsets();
        }
      }
    });

    window.addEventListener("mouseup", () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = "";
      }
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
    styleSearchButton(settingsBtn, 24);
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
    styleSearchButton(closeBtn, 24);
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
    sidebarPanel = panel;
    sidebarContentContainer = content;
    applyFloatingUiOffsets();
    return panel;
  }

  function updateSidebarVisibility(totalMessages) {
    const shouldShow = state.enabled;
    const button = ensureSidebarToggleButton();
    if (!button) return;
    button.style.display = shouldShow ? "flex" : "none";
    if (!shouldShow) hideSidebar();
  }

  function ensureSearchButton() {
    return searchFeature.ensureSearchButton();
  }

  function ensureSearchPanel() {
    return searchFeature.ensureSearchPanel();
  }

  function updateSearchVisibility(totalMessages) {
    searchFeature.updateSearchVisibility(totalMessages);
  }

  // ---------------------------------------------------------------------------
  // Minimap (conversation outline)
  // ---------------------------------------------------------------------------

  function hideMinimapPanel() {
    minimapFeature.hideMinimapPanel();
  }

  function hideMinimapUi() {
    minimapFeature.hideMinimapUi();
  }

  function buildMinimapItems() {
    return minimapFeature.buildMinimapItems();
  }

  function scrollToMinimapItem(virtualId) {
    minimapFeature.scrollToMinimapItem(virtualId);
  }

  function scrollToMinimapRatio(ratio, behavior = "auto") {
    minimapFeature.scrollToMinimapRatio(ratio, behavior);
  }

  function applyStandaloneMinimapMarkerStyle(marker, isActive) {
    minimapFeature.applyStandaloneMinimapMarkerStyle(marker, isActive);
  }

  function applyStandaloneMinimapViewportThumbTheme(viewportThumb) {
    minimapFeature.applyStandaloneMinimapViewportThumbTheme(viewportThumb);
  }

  function updateStandaloneMinimapViewportRect(track) {
    minimapFeature.updateStandaloneMinimapViewportRect(track);
  }

  function updateStandaloneMinimapViewportState(force = false) {
    minimapFeature.updateStandaloneMinimapViewportState(force);
  }

  function populateMinimapPanel(panel) {
    minimapFeature.populateMinimapPanel(panel);
  }

  function showMinimapPanel() {
    minimapFeature.showMinimapPanel();
  }

  function toggleMinimapPanel() {
    minimapFeature.toggleMinimapPanel();
  }

  function ensureMinimapButton() {
    return minimapFeature.ensureMinimapButton();
  }

  function ensureMinimapPanel() {
    return minimapFeature.ensureMinimapPanel();
  }

  function updateMinimapVisibility(totalMessages) {
    minimapFeature.updateMinimapVisibility(totalMessages);
  }

  // ---------------------------------------------------------------------------
  // Token Pressure Gauge
  // ---------------------------------------------------------------------------

  function ensureTokenGaugeElement() {
    if (tokenGaugeElement && tokenGaugeElement.isConnected) return tokenGaugeElement;
    const el = document.createElement("div");
    el.setAttribute("data-chatgpt-token-gauge", "1");
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.right = "0";
    el.style.height = "3px";
    el.style.zIndex = "10001";
    el.style.pointerEvents = "none";
    el.style.background = "transparent";
    el.style.transition = "background 0.8s ease";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    tokenGaugeElement = el;
    return el;
  }

  function updateTokenGauge() {
    if (!state.enabled) {
      if (tokenGaugeElement) tokenGaugeElement.style.background = "transparent";
      return;
    }

    const totalChars = Array.from(state.articleMap.values())
      .reduce((sum, node) => sum + (node.textContent || "").length, 0);
    // Rough approximation: 1 token ≈ 4 characters (OpenAI rule of thumb)
    const estimatedTokens = totalChars / 4;
    const ratio = Math.min(1, estimatedTokens / TOKEN_GAUGE_MAX_TOKENS);

    const el = ensureTokenGaugeElement();

    if (ratio < 0.01) {
      el.style.background = "transparent";
      el.removeAttribute("title");
      return;
    }

    let r, g, b;
    if (ratio <= TOKEN_GAUGE_YELLOW_RATIO) {
      const t = ratio / TOKEN_GAUGE_YELLOW_RATIO;
      r = Math.round(t * 210);
      g = 180;
      b = 0;
    } else if (ratio <= TOKEN_GAUGE_RED_RATIO) {
      const t = (ratio - TOKEN_GAUGE_YELLOW_RATIO) / (TOKEN_GAUGE_RED_RATIO - TOKEN_GAUGE_YELLOW_RATIO);
      r = 210;
      g = Math.round(180 * (1 - t));
      b = 0;
    } else {
      r = 210;
      g = 0;
      b = 0;
    }

    const alpha = 0.35 + ratio * 0.5;
    const pct = Math.round(ratio * 100);
    el.style.background = `linear-gradient(to right, rgba(${r},${g},${b},${alpha}) 0%, rgba(${r},${g},${b},${alpha}) ${pct}%, transparent ${pct}%)`;
    el.title = `~${Math.round(estimatedTokens).toLocaleString()} estimated tokens`;
  }

  // ---------------------------------------------------------------------------
  // Per-article UI (Collapse, Pin, Bookmark)
  // ---------------------------------------------------------------------------

  function setArticleActionIcon(btn, iconName) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.style.width = "13px";
    svg.style.height = "13px";
    svg.style.fill = "none";
    svg.style.stroke = "currentColor";
    svg.style.strokeWidth = "2";
    svg.style.strokeLinecap = "round";
    svg.style.strokeLinejoin = "round";

    const path = document.createElementNS(ns, "path");
    if (iconName === "collapse") {
      path.setAttribute("d", "M6 9l6 6 6-6");
    } else if (iconName === "expand") {
      path.setAttribute("d", "M6 15l6-6 6 6");
    } else if (iconName === "pin") {
      path.setAttribute("d", "M12 17v5M8 3l8 8M6 5l5 5-6 4 4-6 5 5");
    } else if (iconName === "bookmark") {
      path.setAttribute("d", "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z");
    }
    svg.appendChild(path);
    btn.replaceChildren(svg);
  }

  function createArticleActionButton(iconName, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    btn.style.width = "24px";
    btn.style.height = "24px";
    btn.style.borderRadius = "6px";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.padding = "0";
    btn.style.opacity = "0.85";
    btn.style.background = "rgba(17,24,39,0.7)";
    btn.style.color = "#f9fafb";
    btn.style.border = "1px solid rgba(148,163,184,0.45)";
    btn.style.transition = "opacity 0.15s, background 0.15s";
    setArticleActionIcon(btn, iconName);
    btn.addEventListener("mouseenter", () => { btn.style.opacity = "1"; });
    btn.addEventListener("mouseleave", () => { btn.style.opacity = "0.85"; });
    return btn;
  }

  function applyCollapseState(article, virtualId) {
    const isCollapsed = state.collapsedMessages.has(virtualId);
    const contentArea = article.querySelector("[data-message-author-role]");
    const snippet = article.querySelector("[data-gpt-boost-snippet]");
    const sideRail = article.querySelector("[data-gpt-boost-side-rail]");
    const collapseBtn = sideRail && sideRail.querySelector("[data-gpt-boost-collapse-btn]");
    const nativeActionRows = getArticleNativeActionRows(article);

    if (contentArea) {
      contentArea.style.display = isCollapsed ? "none" : "";
    }
    nativeActionRows.forEach((row) => {
      if (!row.dataset.gptBoostOrigDisplay) {
        row.dataset.gptBoostOrigDisplay = row.style.display || "";
      }
      row.style.display = isCollapsed ? "none" : row.dataset.gptBoostOrigDisplay;
    });
    if (snippet) {
      snippet.style.display = isCollapsed ? "block" : "none";
    }
    if (sideRail instanceof HTMLElement) {
      updateArticleSideRailLayout(article, sideRail);
      if (isCollapsed) {
        sideRail.style.opacity = "1";
        sideRail.style.pointerEvents = "auto";
      } else {
        sideRail.style.opacity = "0";
        sideRail.style.pointerEvents = "none";
      }
    }
    if (collapseBtn) {
      setArticleActionIcon(collapseBtn, isCollapsed ? "expand" : "collapse");
      collapseBtn.setAttribute("aria-label", isCollapsed ? "Expand message" : "Collapse message");
    }
    // Apply visual treatment to the article itself so it is always visible
    // and constrains height, even when the inner content is hidden.
    article.style.borderLeft = isCollapsed ? "3px solid rgba(148,163,184,0.55)" : "";
    article.style.background = isCollapsed ? "rgba(148,163,184,0.08)" : "";
    article.style.borderRadius = isCollapsed ? "10px" : "";
  }

  function toggleCollapse(virtualId) {
    if (state.collapsedMessages.has(virtualId)) {
      state.collapsedMessages.delete(virtualId);
    } else {
      state.collapsedMessages.add(virtualId);
    }
    const article = state.articleMap.get(virtualId);
    if (article) applyCollapseState(article, virtualId);
    refreshSidebarTab();
  }

  function updatePinButtonAppearance(article, virtualId) {
    const pinBtn = article.querySelector("[data-gpt-boost-pin-btn]");
    if (!pinBtn) return;
    const isPinned = state.pinnedMessages.has(virtualId);
    pinBtn.style.opacity = isPinned ? "1" : "0.85";
    pinBtn.style.background = isPinned ? "rgba(234,179,8,0.75)" : "rgba(17,24,39,0.7)";
    pinBtn.setAttribute("aria-label", isPinned ? "Unpin message" : "Pin message to top");
  }

  function updateBookmarkButtonAppearance(article, virtualId) {
    const bookmarkBtn = article.querySelector("[data-gpt-boost-bookmark-btn]");
    if (!bookmarkBtn) return;
    const isBookmarked = state.bookmarkedMessages.has(virtualId);
    bookmarkBtn.style.opacity = isBookmarked ? "1" : "0.85";
    bookmarkBtn.style.background = isBookmarked ? "rgba(59,130,246,0.75)" : "rgba(17,24,39,0.7)";
    bookmarkBtn.setAttribute("aria-label", isBookmarked ? "Remove bookmark" : "Bookmark message");
  }

  function getArticleHoverTarget(article) {
    if (!(article instanceof HTMLElement)) return article;
    const messageContainer =
      article.querySelector("[data-message-author-role]") ||
      article.querySelector(".markdown") ||
      article;
    return messageContainer instanceof HTMLElement ? messageContainer : article;
  }

  function getDirectChildAncestor(container, node) {
    if (!(container instanceof HTMLElement) || !(node instanceof HTMLElement)) return null;
    let current = node;
    while (current && current.parentElement && current.parentElement !== container) {
      current = current.parentElement;
    }
    return current && current.parentElement === container ? current : null;
  }

  function getArticleNativeActionRows(article) {
    if (!(article instanceof HTMLElement)) return [];

    const markerSelector = [
      'button[data-testid="copy-turn-action-button"]',
      'button[data-testid="good-response-turn-action-button"]',
      'button[data-testid="bad-response-turn-action-button"]',
      'button[aria-label="More actions"]',
      'button[aria-label="Switch model"]'
    ].join(",");

    const rows = new Set();
    article.querySelectorAll(markerSelector).forEach((btn) => {
      if (!(btn instanceof HTMLElement)) return;
      const directChild = getDirectChildAncestor(article, btn.closest("div") || btn);
      if (!(directChild instanceof HTMLElement)) return;
      if (directChild.hasAttribute("data-gpt-boost-side-rail")) return;
      if (directChild.hasAttribute("data-gpt-boost-snippet")) return;
      rows.add(directChild);
    });

    return Array.from(rows);
  }

  function injectArticleUi(article, virtualId) {
    if (article.dataset.gptBoostUiInjected) return;
    article.dataset.gptBoostUiInjected = "1";

    if (getComputedStyle(article).position === "static") {
      article.style.position = "relative";
    }
    if (!article.dataset.gptBoostOrigPaddingLeft) {
      article.dataset.gptBoostOrigPaddingLeft = article.style.paddingLeft || "";
    }
    article.style.paddingLeft = article.dataset.gptBoostOrigPaddingLeft;
    article.style.transition = "box-shadow 0.15s ease";
    const hoverTarget = getArticleHoverTarget(article);
    if (hoverTarget instanceof HTMLElement && getComputedStyle(hoverTarget).position === "static") {
      hoverTarget.style.position = "relative";
    }
    if (hoverTarget instanceof HTMLElement && !hoverTarget.dataset.gptBoostOrigPaddingLeft) {
      hoverTarget.dataset.gptBoostOrigPaddingLeft = hoverTarget.style.paddingLeft || "";
    }

    const sideRail = document.createElement("div");
    sideRail.setAttribute("data-gpt-boost-side-rail", "1");
    sideRail.style.position = "absolute";
    sideRail.style.left = `${MESSAGE_RAIL_INSIDE_LEFT_PX}px`;
    sideRail.style.top = "8px";
    sideRail.style.transform = "none";
    sideRail.style.display = "flex";
    sideRail.style.flexDirection = "column";
    sideRail.style.gap = "4px";
    sideRail.style.zIndex = "103";
    sideRail.style.alignItems = "center";
    sideRail.style.padding = "2px";
    sideRail.style.borderRadius = "8px";
    sideRail.style.background = "rgba(15,23,42,0.35)";
    sideRail.style.opacity = "0";
    sideRail.style.pointerEvents = "none";
    sideRail.style.border = "1px solid rgba(148,163,184,0.35)";
    sideRail.style.transition = "background 0.15s ease, opacity 0.15s ease";

    const collapseBtn = createArticleActionButton("collapse", "Collapse message");
    collapseBtn.setAttribute("data-gpt-boost-collapse-btn", "1");
    collapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCollapse(virtualId);
    });

    const pinBtn = createArticleActionButton("pin", "Pin message to top");
    pinBtn.setAttribute("data-gpt-boost-pin-btn", "1");
    pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePin(virtualId);
    });

    const bookmarkBtn = createArticleActionButton("bookmark", "Bookmark message");
    bookmarkBtn.setAttribute("data-gpt-boost-bookmark-btn", "1");
    bookmarkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleBookmark(virtualId);
    });

    sideRail.appendChild(collapseBtn);
    sideRail.appendChild(pinBtn);
    sideRail.appendChild(bookmarkBtn);
    (hoverTarget instanceof HTMLElement ? hoverTarget : article).appendChild(sideRail);
    updateArticleSideRailLayout(article, sideRail);

    article.addEventListener("mouseenter", () => {
      const isCollapsed = state.collapsedMessages.has(virtualId);
      if (hoverTarget instanceof HTMLElement) {
        hoverTarget.style.boxShadow = ARTICLE_HOVER_HIGHLIGHT_SHADOW;
        hoverTarget.style.borderRadius = "12px";
        hoverTarget.style.outline = "1px solid rgba(59,130,246,0.18)";
        hoverTarget.style.outlineOffset = "4px";
      }
      if (!isCollapsed) {
        sideRail.style.background = "rgba(59,130,246,0.2)";
        sideRail.style.opacity = "1";
        sideRail.style.pointerEvents = "auto";
      }
    });
    article.addEventListener("mouseleave", () => {
      const isCollapsed = state.collapsedMessages.has(virtualId);
      if (hoverTarget instanceof HTMLElement) {
        hoverTarget.style.boxShadow = "";
        hoverTarget.style.borderRadius = "";
        hoverTarget.style.outline = "";
        hoverTarget.style.outlineOffset = "";
      }
      if (!isCollapsed) {
        sideRail.style.background = "rgba(15,23,42,0.35)";
        sideRail.style.opacity = "0";
        sideRail.style.pointerEvents = "none";
      }
    });

    const snippet = document.createElement("div");
    snippet.setAttribute("data-gpt-boost-snippet", "1");
    snippet.style.display = "none";
    snippet.style.fontSize = "13px";
    snippet.style.opacity = "0.65";
    snippet.style.overflow = "hidden";
    snippet.style.whiteSpace = "nowrap";
    snippet.style.textOverflow = "ellipsis";
    snippet.style.padding = "6px 8px";
    snippet.style.marginTop = "6px";
    snippet.style.maxWidth = "100%";
    snippet.style.boxSizing = "border-box";
    snippet.style.border = "1px solid rgba(148,163,184,0.35)";
    snippet.style.borderRadius = "8px";
    snippet.style.background = "rgba(148,163,184,0.08)";

    const textSource = article.querySelector("[data-message-author-role]") || article;
    const rawText = (textSource.textContent || "").trim().replace(/\s+/g, " ");
    snippet.textContent = rawText.length > ARTICLE_SNIPPET_LENGTH
      ? rawText.slice(0, ARTICLE_SNIPPET_LENGTH) + "…"
      : rawText;

    article.appendChild(snippet);
  }

  function updateArticleSideRailLayout(article, sideRail) {
    if (!(article instanceof HTMLElement) || !(sideRail instanceof HTMLElement)) return;
    const virtualId = article.dataset.virtualId;
    const isCollapsed = !!(virtualId && state.collapsedMessages.has(virtualId));
    const hoverTarget = getArticleHoverTarget(article);

    if (isCollapsed) {
      if (hoverTarget instanceof HTMLElement) {
        hoverTarget.style.paddingLeft = hoverTarget.dataset.gptBoostOrigPaddingLeft || "";
      } else {
        article.style.paddingLeft = article.dataset.gptBoostOrigPaddingLeft || "";
      }

      sideRail.style.position = "static";
      sideRail.style.top = "";
      sideRail.style.left = "";
      sideRail.style.transform = "";
      sideRail.style.marginTop = "4px";
      sideRail.style.alignSelf = "flex-end";
      sideRail.style.flexDirection = "row";
      sideRail.style.gap = "4px";
      sideRail.style.padding = "0";
      sideRail.style.border = "none";
      sideRail.style.background = "transparent";
      if (sideRail.parentElement !== article) {
        article.appendChild(sideRail);
      } else {
        article.appendChild(sideRail);
      }
      return;
    }

    sideRail.style.position = "absolute";
    sideRail.style.top = "8px";
    sideRail.style.left = `${MESSAGE_RAIL_INSIDE_LEFT_PX}px`;
    sideRail.style.transform = "none";
    sideRail.style.marginTop = "";
    sideRail.style.alignSelf = "";
    sideRail.style.flexDirection = "column";
    sideRail.style.gap = "4px";
    sideRail.style.padding = "2px";
    sideRail.style.border = "1px solid rgba(148,163,184,0.35)";
    sideRail.style.background = "rgba(15,23,42,0.35)";
    if (hoverTarget instanceof HTMLElement) {
      if (sideRail.parentElement !== hoverTarget) {
        hoverTarget.appendChild(sideRail);
      }
      hoverTarget.style.paddingLeft = `${MESSAGE_RAIL_INSIDE_PADDING_PX}px`;
    } else {
      if (sideRail.parentElement !== article) {
        article.appendChild(sideRail);
      }
      article.style.paddingLeft = `${MESSAGE_RAIL_INSIDE_PADDING_PX}px`;
    }
  }

  function refreshArticleSideRailLayout() {
    document.querySelectorAll('[data-gpt-boost-ui-injected="1"]').forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const sideRail = el.querySelector("[data-gpt-boost-side-rail]");
      if (sideRail instanceof HTMLElement) {
        updateArticleSideRailLayout(el, sideRail);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Pin to Top
  // ---------------------------------------------------------------------------

  function scrollToVirtualId(virtualId, attempt = 0) {
    const selectorId = escapeSelectorValue(virtualId);
    const target = document.querySelector(`[data-virtual-id="${selectorId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    scheduleVirtualization();

    if (attempt < MAX_SCROLL_ATTEMPTS) {
      setTimeout(() => {
        scrollToVirtualId(virtualId, attempt + 1);
      }, SCROLL_RETRY_DELAY_MS);
    }
  }

  function ensurePinnedBar() {
    if (pinnedBarElement && pinnedBarElement.isConnected) return pinnedBarElement;

    const bar = document.createElement("div");
    bar.setAttribute("data-chatgpt-pinned-bar", "1");
    bar.style.position = "fixed";
    bar.style.top = "0";
    bar.style.left = "50%";
    bar.style.transform = "translateX(-50%)";
    bar.style.zIndex = "10000";
    bar.style.display = "none";
    bar.style.flexDirection = "row";
    bar.style.flexWrap = "wrap";
    bar.style.gap = "4px";
    bar.style.padding = "4px 10px";
    bar.style.maxWidth = "700px";
    bar.style.borderRadius = "0 0 12px 12px";
    bar.style.backdropFilter = "blur(8px)";
    bar.style.pointerEvents = "auto";

    const items = document.createElement("div");
    items.setAttribute("data-gpt-boost-pinned-items", "1");
    items.style.display = "flex";
    items.style.flexDirection = "row";
    items.style.flexWrap = "wrap";
    items.style.gap = "4px";
    items.style.alignItems = "center";
    bar.appendChild(items);

    document.body.appendChild(bar);
    pinnedBarElement = bar;
    applyThemeToUi();
    return bar;
  }

  function updatePinnedBar() {
    if (state.pinnedMessages.size === 0) {
      if (pinnedBarElement) pinnedBarElement.style.display = "none";
      return;
    }

    const bar = ensurePinnedBar();
    if (!bar) return;

    const itemsContainer = bar.querySelector("[data-gpt-boost-pinned-items]");
    if (!itemsContainer) return;

    itemsContainer.innerHTML = "";
    const theme = getThemeTokens();

    state.pinnedMessages.forEach((id) => {
      const article = state.articleMap.get(id);
      if (!article) return;

      const textSource = article.querySelector("[data-message-author-role]") || article;
      const rawText = (textSource.textContent || "").trim().replace(/\s+/g, " ");
      const snippet = rawText.length > 80 ? rawText.slice(0, 80) + "…" : rawText;

      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "4px";
      item.style.padding = "2px 6px";
      item.style.borderRadius = "6px";
      item.style.background = theme.buttonMutedBg;
      item.style.color = theme.text;
      item.style.fontSize = "11px";
      item.style.cursor = "pointer";
      item.style.border = `1px solid ${theme.panelBorder}`;

      const textEl = document.createElement("span");
      textEl.textContent = "📌 " + snippet;
      textEl.style.overflow = "hidden";
      textEl.style.whiteSpace = "nowrap";
      textEl.style.textOverflow = "ellipsis";
      textEl.style.maxWidth = "220px";

      const unpinBtn = document.createElement("button");
      unpinBtn.type = "button";
      unpinBtn.textContent = "×";
      unpinBtn.setAttribute("aria-label", "Unpin message");
      unpinBtn.style.background = "none";
      unpinBtn.style.border = "none";
      unpinBtn.style.cursor = "pointer";
      unpinBtn.style.fontSize = "13px";
      unpinBtn.style.color = theme.mutedText;
      unpinBtn.style.padding = "0";
      unpinBtn.style.lineHeight = "1";
      unpinBtn.style.flexShrink = "0";
      unpinBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        togglePin(id);
      });

      item.appendChild(textEl);
      item.appendChild(unpinBtn);
      item.addEventListener("click", () => scrollToVirtualId(id));

      itemsContainer.appendChild(item);
    });

    bar.style.display = "flex";
  }

  function togglePin(virtualId) {
    if (!currentConversationKey) {
      setCurrentConversationKey(getConversationStorageKey());
    }
    const article = state.articleMap.get(virtualId);
    const key = article instanceof HTMLElement ? getArticleMessageKey(article, virtualId) : "";
    if (state.pinnedMessages.has(virtualId)) {
      state.pinnedMessages.delete(virtualId);
      if (key) persistedPinnedMessageKeys.delete(key);
    } else {
      state.pinnedMessages.add(virtualId);
      if (key) persistedPinnedMessageKeys.add(key);
    }
    scheduleFlagsSave();
    updatePinnedBar();
    if (article) updatePinButtonAppearance(article, virtualId);
    refreshSidebarTab();
  }

  function renderSnippetsTabContent(container) {
    renderSidebarSnippetsTab({
      container,
      theme: getThemeTokens(),
      articleMap: state.articleMap,
      snippetMaxHeightPx: SIDEBAR_SNIPPET_MAX_HEIGHT_PX,
      onJumpToMessage: (virtualId) => {
        scrollToVirtualId(virtualId);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Markdown Download
  // ---------------------------------------------------------------------------

  function downloadMarkdown() {
    const sortedEntries = Array.from(state.articleMap.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    if (!sortedEntries.length) return;

    const lines = [
      "# ChatGPT Conversation\n",
      `> Exported: ${new Date().toLocaleString()} \n`,
      "---"
    ];

    sortedEntries.forEach(([, node]) => {
      const roleEl = node.querySelector("[data-message-author-role]");
      const rawRole = roleEl ? (roleEl.getAttribute("data-message-author-role") || "unknown") : "unknown";
      const displayRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
      const messageRoot = roleEl || node;
      if (!(messageRoot instanceof HTMLElement)) return;

      const contentParts = extractMarkdownPartsFromMessage(messageRoot);
      if (!contentParts.length) return;

      lines.push(`\n## ${displayRole} \n`);
      lines.push(contentParts.join("\n\n"));
      lines.push("\n---");
    });

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatgpt - ${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function convertDomToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const tagName = node.tagName.toLowerCase();

    // Handle Code Blocks (PRE)
    if (tagName === "pre") {
      const codeEl = node.querySelector("code");
      const source = codeEl || node;
      // Use innerText to preserve newlines from layout if textContent fails
      const rawText = extractTextPreservingNewlines(source);
      const codeText = toUnixNewlines(rawText).trimEnd();
      const lang = inferCodeLanguage(source);
      return `\n\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
    }

    // Handle Paragraphs and Headers
    if (["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
      let prefix = "";
      if (tagName === "h1") prefix = "# ";
      else if (tagName === "h2") prefix = "## ";
      else if (tagName === "h3") prefix = "### ";
      else if (tagName === "h4") prefix = "#### ";
      else if (tagName === "h5") prefix = "##### ";
      else if (tagName === "h6") prefix = "###### ";

      const content = Array.from(node.childNodes).map(convertDomToMarkdown).join("");
      // Only return if content is not empty (ignoring whitespace)
      if (!content.trim()) return "";
      return `\n\n${prefix}${content.trim()}\n\n`;
    }

    // Handle Lists
    if (tagName === "ul" || tagName === "ol") {
      const content = Array.from(node.childNodes).map(convertDomToMarkdown).join("");
      return `\n${content}\n`;
    }
    if (tagName === "li") {
      const content = Array.from(node.childNodes).map(convertDomToMarkdown).join("");
      const parentTag = node.parentElement ? node.parentElement.tagName.toLowerCase() : "ul";
      const prefix = parentTag === "ol" ? "1. " : "- ";
      return `\n${prefix}${content.trim()}`;
    }

    // Handle formatting
    if (tagName === "strong" || tagName === "b") {
      return `**${Array.from(node.childNodes).map(convertDomToMarkdown).join("")}**`;
    }
    if (tagName === "em" || tagName === "i") {
      return `*${Array.from(node.childNodes).map(convertDomToMarkdown).join("")}*`;
    }
    if (tagName === "code") {
      return `\`${Array.from(node.childNodes).map(convertDomToMarkdown).join("")}\``;
    }
    if (tagName === "a") {
      const href = node.getAttribute("href");
      const text = Array.from(node.childNodes).map(convertDomToMarkdown).join("");
      return `[${text}](${href})`;
    }
    if (tagName === "br") return "\n";
    if (tagName === "hr") return "\n---\n";

    // Recurse for others
    return Array.from(node.childNodes).map(convertDomToMarkdown).join("");
  }

  function extractMarkdownPartsFromMessage(messageRoot) {
    const markdown = convertDomToMarkdown(messageRoot);
    const cleanMarkdown = markdown.replace(/\n{3,}/g, "\n\n").trim();
    return [cleanMarkdown];
  }

  function ensureDownloadButton() {
    if (downloadButton && downloadButton.isConnected) return downloadButton;
    if (!document.body) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-chatgpt-download", "trigger");
    button.style.position = "fixed";
    button.style.right = `${DOWNLOAD_BUTTON_RIGHT_OFFSET_PX}px`;
    button.style.top = `${DOWNLOAD_BUTTON_TOP_OFFSET_PX}px`;
    button.style.zIndex = "10002";
    button.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.style.width = "14px";
    icon.style.height = "14px";
    icon.style.fill = "none";
    icon.style.stroke = "currentColor";
    icon.style.strokeWidth = "2";
    icon.style.strokeLinecap = "round";
    icon.style.strokeLinejoin = "round";
    const ln1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    ln1.setAttribute("x1", "12"); ln1.setAttribute("y1", "3");
    ln1.setAttribute("x2", "12"); ln1.setAttribute("y2", "15");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", "7 10 12 15 17 10");
    const ln2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    ln2.setAttribute("x1", "5"); ln2.setAttribute("y1", "21");
    ln2.setAttribute("x2", "19"); ln2.setAttribute("y2", "21");
    icon.appendChild(ln1);
    icon.appendChild(poly);
    icon.appendChild(ln2);

    button.appendChild(icon);
    button.setAttribute("aria-label", "Download conversation as Markdown");
    styleSearchButton(button, DOWNLOAD_BUTTON_SIZE_PX);
    button.style.display = "none";
    button.addEventListener("click", downloadMarkdown);

    document.body.appendChild(button);
    downloadButton = button;
    applyFloatingUiOffsets();
    applyThemeToUi();
    return button;
  }

  function updateDownloadVisibility(totalMessages) {
    const shouldShow = state.enabled && totalMessages > 0;
    const button = ensureDownloadButton();
    if (!button) return;
    button.style.display = shouldShow ? "flex" : "none";
  }

  // updateCodePanelVisibility was removed when the standalone floating code-panel
  // button was refactored into the sidebar snippets tab (b232a91), but its call
  // inside updateIndicator() was not cleaned up. This stub prevents the
  // ReferenceError that was crashing virtualizeNow on every tick.
  function updateCodePanelVisibility(_totalMessages) {
    // Code panel is now in the sidebar snippets tab — nothing to do here.
  }

  // ---------------------------------------------------------------------------
  // Bookmarks
  // ---------------------------------------------------------------------------

  function toggleBookmark(virtualId) {
    if (!currentConversationKey) {
      setCurrentConversationKey(getConversationStorageKey());
    }
    const article = state.articleMap.get(virtualId);
    const key = article instanceof HTMLElement ? getArticleMessageKey(article, virtualId) : "";
    if (state.bookmarkedMessages.has(virtualId)) {
      state.bookmarkedMessages.delete(virtualId);
      if (key) persistedBookmarkedMessageKeys.delete(key);
    } else {
      state.bookmarkedMessages.add(virtualId);
      if (key) persistedBookmarkedMessageKeys.add(key);
    }
    scheduleFlagsSave();
    if (article) updateBookmarkButtonAppearance(article, virtualId);
    if (bookmarksPanel && bookmarksPanel.style.display !== "none") {
      populateBookmarksPanel(bookmarksPanel);
    }
    refreshSidebarTab();
  }

  function hideBookmarksPanel() {
    if (bookmarksPanel) bookmarksPanel.style.display = "none";
  }

  function hideBookmarksUi() {
    if (bookmarksButton) bookmarksButton.style.display = "none";
    hideBookmarksPanel();
  }

  function populateBookmarksPanel(panel) {
    const listContainer = panel.querySelector("[data-chatgpt-bookmarks=\"list\"]");
    if (!listContainer) return;

    listContainer.innerHTML = "";
    const theme = getThemeTokens();

    const appendSection = (titleText, ids, emptyText) => {
      const section = document.createElement("div");
      section.style.display = "flex";
      section.style.flexDirection = "column";
      section.style.gap = "6px";
      section.style.padding = "4px 0";

      const title = document.createElement("div");
      title.textContent = `${titleText} (${ids.length})`;
      title.style.fontSize = "10px";
      title.style.letterSpacing = "0.12em";
      title.style.textTransform = "uppercase";
      title.style.opacity = "0.72";
      section.appendChild(title);

      if (!ids.length) {
        const empty = document.createElement("div");
        empty.style.fontSize = "12px";
        empty.style.opacity = "0.6";
        empty.style.padding = "4px 2px";
        empty.textContent = emptyText;
        section.appendChild(empty);
        listContainer.appendChild(section);
        return;
      }

      ids.forEach((id, index) => {
        const article = state.articleMap.get(id);
        if (!article) return;

        const role = getMessageRole(article);
        const roleStyle = getRoleSurfaceStyle(role, theme);
        const textSource = article.querySelector("[data-message-author-role]") || article;
        const rawText = (textSource.textContent || "").trim().replace(/\s+/g, " ");
        const snippet = rawText.length > MINIMAP_PROMPT_SNIPPET_LENGTH
          ? rawText.slice(0, MINIMAP_PROMPT_SNIPPET_LENGTH) + "…"
          : rawText;

        const item = document.createElement("button");
        item.type = "button";
        item.style.display = "flex";
        item.style.flexDirection = "column";
        item.style.gap = "4px";
        item.style.flexShrink = "0";
        item.style.width = "100%";
        item.style.textAlign = "left";
        item.style.background = roleStyle.surfaceBg;
        item.style.border = `1px solid ${roleStyle.borderColor}`;
        item.style.borderLeft = `3px solid ${roleStyle.accentColor}`;
        item.style.borderRadius = "10px";
        item.style.padding = "6px 8px";
        item.style.cursor = "pointer";
        item.style.color = theme.text;
        item.style.wordBreak = "break-word";
        item.style.fontFamily = "inherit";
        item.addEventListener("mouseenter", () => { item.style.background = roleStyle.activeSurfaceBg; });
        item.addEventListener("mouseleave", () => { item.style.background = roleStyle.surfaceBg; });
        item.addEventListener("click", () => {
          hideBookmarksPanel();
          scrollToVirtualId(id);
        });

        const roleChip = createRoleChip(roleStyle);

        const snippetLine = document.createElement("div");
        snippetLine.textContent = `${index + 1}. ${snippet}`;
        snippetLine.style.fontSize = "12px";
        snippetLine.style.lineHeight = "1.4";

        const metaLine = document.createElement("div");
        metaLine.textContent = `#${id} • ${index + 1}/${ids.length}`;
        metaLine.style.fontSize = "10px";
        metaLine.style.opacity = "0.72";

        item.appendChild(roleChip);
        item.appendChild(snippetLine);
        item.appendChild(metaLine);
        section.appendChild(item);
      });

      listContainer.appendChild(section);
    };

    const sortedPinnedIds = Array.from(state.pinnedMessages).sort((a, b) => Number(a) - Number(b));
    const sortedBookmarkedIds = Array.from(state.bookmarkedMessages).sort((a, b) => Number(a) - Number(b));
    appendSection("Pinned", sortedPinnedIds, "No pinned messages.");
    appendSection("Bookmarked", sortedBookmarkedIds, "No bookmarked messages.");
  }

  function showBookmarksPanel() {
    openSidebar("bookmarks");
  }

  function toggleBookmarksPanel() {
    toggleSidebar("bookmarks");
  }

  function ensureBookmarksButton() {
    if (bookmarksButton && bookmarksButton.isConnected) return bookmarksButton;
    if (!document.body) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-chatgpt-bookmarks", "toggle");
    button.style.position = "fixed";
    button.style.right = `${BOOKMARKS_BUTTON_RIGHT_OFFSET_PX}px`;
    button.style.top = `${BOOKMARKS_BUTTON_TOP_OFFSET_PX}px`;
    button.style.zIndex = "10002";
    button.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.style.width = "14px";
    icon.style.height = "14px";
    icon.style.fill = "none";
    icon.style.stroke = "currentColor";
    icon.style.strokeWidth = "2";
    icon.style.strokeLinecap = "round";
    icon.style.strokeLinejoin = "round";
    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d", "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z");
    icon.appendChild(pathEl);

    button.appendChild(icon);
    button.setAttribute("aria-label", "View bookmarks");
    styleSearchButton(button, BOOKMARKS_BUTTON_SIZE_PX);
    button.style.display = "none";
    button.addEventListener("click", toggleBookmarksPanel);

    document.body.appendChild(button);
    bookmarksButton = button;
    applyFloatingUiOffsets();
    applyThemeToUi();
    return button;
  }

  function ensureBookmarksPanel() {
    if (bookmarksPanel && bookmarksPanel.isConnected) return bookmarksPanel;
    if (!document.body) return null;

    const panel = document.createElement("div");
    panel.setAttribute("data-chatgpt-bookmarks", "panel");
    panel.style.position = "fixed";
    panel.style.top = `${BOOKMARKS_PANEL_TOP_OFFSET_PX}px`;
    panel.style.right = `${BOOKMARKS_PANEL_RIGHT_OFFSET_PX}px`;
    panel.style.zIndex = "10001";
    panel.style.width = `${BOOKMARKS_PANEL_WIDTH_PX}px`;
    panel.style.maxHeight = `calc(100vh - ${BOOKMARKS_PANEL_TOP_OFFSET_PX + 16}px)`;
    panel.style.display = "none";
    panel.style.flexDirection = "column";
    panel.style.gap = "8px";
    panel.style.padding = "10px";
    panel.style.borderRadius = "14px";
    panel.style.background = "rgba(15, 23, 42, 0.92)";
    panel.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.28)";
    panel.style.color = "#f9fafb";
    panel.style.backdropFilter = "blur(6px)";
    panel.style.boxSizing = "border-box";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "8px";

    const title = document.createElement("span");
    title.textContent = "Bookmarks";
    title.style.fontSize = "12px";
    title.style.fontWeight = "600";
    title.style.lineHeight = "1.2";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close bookmarks");
    styleSearchButton(closeBtn, 22);
    closeBtn.style.display = "flex";
    closeBtn.style.background = "rgba(148, 163, 184, 0.2)";
    closeBtn.addEventListener("click", hideBookmarksPanel);

    header.appendChild(title);
    header.appendChild(closeBtn);

    const listContainer = document.createElement("div");
    listContainer.setAttribute("data-chatgpt-bookmarks", "list");
    listContainer.style.overflowY = "auto";
    listContainer.style.display = "flex";
    listContainer.style.flexDirection = "column";
    listContainer.style.gap = "2px";

    panel.appendChild(header);
    panel.appendChild(listContainer);

    document.body.appendChild(panel);
    bookmarksPanel = panel;
    applyFloatingUiOffsets();
    applyThemeToUi();
    return panel;
  }

  function updateBookmarksVisibility(totalMessages) {
    if (bookmarksButton) bookmarksButton.style.display = "none";
    updateSidebarVisibility(totalMessages);
  }

  function updateIndicator(totalMessages, renderedMessages) {
    if (!state.enabled) {
      hideAllUiElements();
      return;
    }

    updateSearchVisibility(totalMessages);
    updateMinimapVisibility(totalMessages);
    updateCodePanelVisibility(totalMessages);
    updateDownloadVisibility(totalMessages);
    updateBookmarksVisibility(totalMessages);
    updateTokenGauge();
    applyFloatingUiOffsets();

    const hidden = totalMessages - renderedMessages;
    if (totalMessages === 0 || hidden <= 0) {
      hideIndicator();
      updateScrollButtons(totalMessages);
      return;
    }

    const element = ensureIndicatorElement();
    const clampedHiddenCount = Math.min(totalMessages, Math.max(0, hidden));
    const ratio = totalMessages > 0 ? clampedHiddenCount / totalMessages : 0;
    const bufferRange = config.MAX_MARGIN_PX - config.MIN_MARGIN_PX;
    const bufferRatio = bufferRange > 0
      ? (config.MARGIN_PX - config.MIN_MARGIN_PX) / bufferRange
      : 0;
    const clampedBufferRatio = Math.min(1, Math.max(0, bufferRatio));
    const minHeight =
      INDICATOR_BASE_MIN_HEIGHT_PX +
      clampedBufferRatio * INDICATOR_BUFFER_MIN_BOOST_PX;
    const maxHeight =
      INDICATOR_BASE_MAX_HEIGHT_PX +
      clampedBufferRatio * INDICATOR_BUFFER_MAX_BOOST_PX;
    const height = minHeight + ratio * (maxHeight - minHeight);
    const opacity =
      INDICATOR_MIN_OPACITY +
      ratio * (INDICATOR_MAX_OPACITY - INDICATOR_MIN_OPACITY);

    element.style.height = `${Math.round(height)}px`;
    element.style.opacity = String(opacity);
    element.setAttribute(
      "aria-label",
      `Virtualizing ${hidden} message${hidden === 1 ? "" : "s"
      } with ${config.MARGIN_PX}px buffer`
    );
    element.style.display = "block";
    updateScrollButtons(totalMessages);
  }

  function convertArticleToSpacer(articleElement) {
    const id = articleElement.dataset.virtualId;
    if (!id || !articleElement.isConnected) return;

    const rect = articleElement.getBoundingClientRect();
    const height = rect.height || 24;

    const spacer = document.createElement("div");
    spacer.dataset.chatgptVirtualSpacer = "1";
    spacer.dataset.virtualId = id;
    spacer.style.height = `${height}px`;
    spacer.style.pointerEvents = "none";
    spacer.style.opacity = "0";

    articleElement.replaceWith(spacer);
    state.articleMap.set(id, articleElement);
  }

  function convertSpacerToArticle(spacerElement) {
    const id = spacerElement.dataset.virtualId;
    if (!id) return;

    const original = state.articleMap.get(id);
    if (!original || original.isConnected) return;

    spacerElement.replaceWith(original);
  }

  function updateStats() {
    const activeNodes = getActiveConversationNodes();
    const spacers = document.querySelectorAll('div[data-chatgpt-virtual-spacer="1"]');
    const nodes = [...activeNodes, ...spacers];

    let total = 0;
    let rendered = 0;

    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (!node.dataset.virtualId) return;

      total += 1;
      if (!isVirtualSpacerNode(node)) rendered += 1;
    });

    const isTotalChanged = state.stats.totalMessages !== total;

    state.stats.totalMessages = total;
    state.stats.renderedMessages = rendered;
    updateIndicator(total, rendered);

    if (isTotalChanged) {
      refreshSidebarTab();
      if (minimapPanel && minimapPanel.style.display !== "none") {
        populateMinimapPanel(minimapPanel);
      }
    }
    updateMapViewportState();
    updateStandaloneMinimapViewportState();
  }

  function virtualizeNow() {
    log("virtualizeNow", { enabled: state.enabled, lifecycle: state.lifecycleStatus });
    if (!state.enabled) {
      hideAllUiElements();
      return;
    }

    if (!state.scrollElement) {
      attachOrUpdateScrollListener();
    }

    ensureVirtualIds();

    const activeNodes = getActiveConversationNodes();
    const spacers = document.querySelectorAll('div[data-chatgpt-virtual-spacer="1"]');
    const nodes = [...activeNodes, ...spacers];
    if (!nodes.length) {
      log("virtualize: no messages yet");
      updateIndicator(0, 0);
      queueDeferredVirtualizationRetry();
      return;
    }

    const viewport = getViewportMetrics();
    if (viewport.height <= 0) {
      log("virtualize: skipped due to unavailable viewport height");
      queueDeferredVirtualizationRetry();
      return;
    }
    state.emptyVirtualizationRetryCount = 0;

    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;

      const rect = node.getBoundingClientRect();
      const relativeTop = rect.top - viewport.top;
      const relativeBottom = rect.bottom - viewport.top;

      const isOutside =
        relativeBottom < -config.MARGIN_PX ||
        relativeTop > viewport.height + config.MARGIN_PX;

      if (isVirtualSpacerNode(node)) {
        if (!isOutside) convertSpacerToArticle(node);
      } else {
        if (isOutside) convertArticleToSpacer(node);
      }
    });

    updateStats();
    log(
      `virtualize: total=${state.stats.totalMessages}, rendered=${state.stats.renderedMessages}`
    );
  }

  function scheduleVirtualization() {
    if (state.requestAnimationScheduled) return;
    state.requestAnimationScheduled = true;
    log("scheduleVirtualization: queuing rAF");
    requestAnimationFrame(() => {
      state.requestAnimationScheduled = false;
      virtualizeNow();
    });
  }

  function getStatsSnapshot() {
    const { totalMessages, renderedMessages } = state.stats;
    const saved =
      totalMessages > 0
        ? Math.round((1 - renderedMessages / totalMessages) * 100)
        : 0;

    return {
      totalMessages,
      renderedMessages,
      memorySavedPercent: saved
    };
  }

  // ---------------------------------------------------------------------------
  // Main: boot, teardown, URL watcher
  // ---------------------------------------------------------------------------

  function attachOrUpdateScrollListener() {
    if (!hasAnyMessages()) return;

    const container = findScrollContainer();
    if (!container) return;

    if (container === state.scrollElement && state.cleanupScrollListener) {
      return; // already correct
    }

    if (state.cleanupScrollListener) {
      state.cleanupScrollListener();
      state.cleanupScrollListener = null;
    }

    state.scrollElement = container;
    state.cleanupScrollListener = setupScrollTracking(
      container,
      config.SCROLL_THROTTLE_MS,
      () => {
        scheduleVirtualization();
        updateMapViewportState();
        updateStandaloneMinimapViewportState();
      }
    );
    if (isSidebarOpen()) {
      applySidebarLayoutOffset(currentSidebarWidthPx);
      applyFloatingUiOffsets();
    }

    log(
      "Scroll listener attached to:",
      container === window
        ? "window"
        : `${container.tagName} ${container.className || ""}`
    );
  }

  function handleResize() {
    attachOrUpdateScrollListener();
    refreshArticleSideRailLayout();
    scheduleVirtualization();
  }

  function bootVirtualizer() {
    log("bootVirtualizer called", { lifecycle: state.lifecycleStatus });
    if (state.lifecycleStatus !== "IDLE") {
      log("bootVirtualizer: already active, aborting");
      return;
    }

    if (!themeObserver) {
      themeObserver = new MutationObserver(() => applyThemeToUi());
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }
    bindSidebarHotkey();
    applyRoleColorSettings();
    applyConversationLayoutSettings();

    const root = findConversationRoot();
    state.conversationRoot = root;

    const mutationObserver = createDebouncedObserver(() => {
      attachOrUpdateScrollListener();
      scheduleVirtualization();
    }, config.MUTATION_DEBOUNCE_MS);
    // Observe the conversation root (not document.body): a narrower target means
    // far fewer mutations per second, preventing debounce starvation on load.
    mutationObserver.observe(root, {
      childList: true,
      subtree: true
    });
    // Also observe body for SPA navigation mutations (new root appearing).
    const bodyObserver = createDebouncedObserver(() => {
      const newRoot = findConversationRoot();
      if (newRoot !== state.conversationRoot) {
        state.conversationRoot = newRoot;
        mutationObserver.disconnect();
        mutationObserver.observe(newRoot, { childList: true, subtree: true });
      }
      attachOrUpdateScrollListener();
      scheduleVirtualization();
    }, 300);
    bodyObserver.observe(document.body, { childList: true, subtree: false });
    state.bodyObserver = bodyObserver;

    state.lifecycleStatus = "OBSERVING";
    state.observer = mutationObserver;

    log("Virtualizer booted.");
    setCurrentConversationKey(getConversationStorageKey());

    // Ensure we start tracking even if messages already exist
    attachOrUpdateScrollListener();
    scheduleVirtualization();
    // Belt-and-suspenders: call virtualizeNow directly (no rAF) in case rAF is
    // delayed or throttled in the Firefox content script context at page load.
    setTimeout(() => {
      attachOrUpdateScrollListener();
      virtualizeNow();
    }, 0);
    setTimeout(() => {
      attachOrUpdateScrollListener();
      virtualizeNow();
    }, 250);
    loadPersistedFlagsForConversation(syncFlagsFromPersistedKeys).catch(() => { });
  }

  function teardownVirtualizer() {
    applySidebarLayoutOffset(0);

    if (state.observer) state.observer.disconnect();
    if (state.bodyObserver) { state.bodyObserver.disconnect(); state.bodyObserver = null; }
    if (state.cleanupScrollListener) state.cleanupScrollListener();
    if (deferredVirtualizationTimer !== null) {
      clearTimeout(deferredVirtualizationTimer);
      deferredVirtualizationTimer = null;
    }

    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }

    state.scrollElement = null;
    state.cleanupScrollListener = null;
    state.observer = null;
    state.conversationRoot = null;
    state.lifecycleStatus = "IDLE";
    state.requestAnimationScheduled = false;

    // Restore all original elements BEFORE clearing the map so React can unmount them cleanly
    document
      .querySelectorAll('div[data-chatgpt-virtual-spacer="1"]')
      .forEach((spacer) => convertSpacerToArticle(spacer));

    state.articleMap.clear();
    state.nextVirtualId = 1;
    state.emptyVirtualizationRetryCount = 0;

    if (indicatorElement && indicatorElement.isConnected) {
      indicatorElement.remove();
    }
    indicatorElement = null;

    if (scrollToTopButton && scrollToTopButton.isConnected) {
      scrollToTopButton.remove();
    }
    if (scrollToBottomButton && scrollToBottomButton.isConnected) {
      scrollToBottomButton.remove();
    }
    scrollToTopButton = null;
    scrollToBottomButton = null;

    if (searchButton && searchButton.isConnected) {
      searchButton.remove();
    }
    if (searchPanel && searchPanel.isConnected) {
      searchPanel.remove();
    }
    if (searchDebounceTimer !== null) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
    searchButton = null;
    searchPanel = null;
    searchInput = null;
    searchPrevButton = null;
    searchNextButton = null;
    searchCountLabel = null;
    searchCountPrimaryLabel = null;
    searchCountSecondaryLabel = null;
    searchCloseButton = null;
    searchState.query = "";
    searchState.results = [];
    searchState.activeIndex = -1;
    searchState.indexedTotal = 0;
    searchState.matchCount = 0;
    clearSearchHighlight();

    if (minimapButton && minimapButton.isConnected) {
      minimapButton.remove();
    }
    if (minimapPanel && minimapPanel.isConnected) {
      minimapPanel.remove();
    }
    minimapButton = null;
    minimapPanel = null;

    if (codePanelButton && codePanelButton.isConnected) codePanelButton.remove();
    if (codePanelPanel && codePanelPanel.isConnected) codePanelPanel.remove();
    codePanelButton = null;
    codePanelPanel = null;

    if (downloadButton && downloadButton.isConnected) downloadButton.remove();
    downloadButton = null;

    if (bookmarksButton && bookmarksButton.isConnected) bookmarksButton.remove();
    if (bookmarksPanel && bookmarksPanel.isConnected) bookmarksPanel.remove();
    bookmarksButton = null;
    bookmarksPanel = null;

    if (sidebarToggleButton && sidebarToggleButton.isConnected) sidebarToggleButton.remove();
    if (sidebarPanel && sidebarPanel.isConnected) sidebarPanel.remove();
    sidebarToggleButton = null;
    sidebarPanel = null;
    sidebarContentContainer = null;
    if (tokenGaugeElement && tokenGaugeElement.isConnected) tokenGaugeElement.remove();
    tokenGaugeElement = null;

    if (pinnedBarElement && pinnedBarElement.isConnected) pinnedBarElement.remove();
    pinnedBarElement = null;

    state.collapsedMessages.clear();
    state.pinnedMessages.clear();
    state.bookmarkedMessages.clear();
    persistedPinnedMessageKeys.clear();
    persistedBookmarkedMessageKeys.clear();

    document.querySelectorAll("[data-gpt-boost-ui-injected]").forEach((el) => {
      el.removeAttribute("data-gpt-boost-ui-injected");
      const overlay = el.querySelector("[data-gpt-boost-overlay]");
      if (overlay) overlay.remove();
      const sideRail = el.querySelector("[data-gpt-boost-side-rail]");
      if (sideRail) sideRail.remove();
      const snippet = el.querySelector("[data-gpt-boost-snippet]");
      if (snippet) snippet.remove();
      el.querySelectorAll("[data-gpt-boost-orig-display]").forEach((row) => {
        if (!(row instanceof HTMLElement)) return;
        row.style.display = row.dataset.gptBoostOrigDisplay || "";
        delete row.dataset.gptBoostOrigDisplay;
      });
      if (el instanceof HTMLElement) {
        el.style.boxShadow = "";
        const hoverTarget = getArticleHoverTarget(el);
        if (hoverTarget instanceof HTMLElement) {
          hoverTarget.style.boxShadow = "";
          hoverTarget.style.borderRadius = "";
          hoverTarget.style.outline = "";
          hoverTarget.style.outlineOffset = "";
          const hoverOriginalPaddingLeft = hoverTarget.dataset.gptBoostOrigPaddingLeft || "";
          hoverTarget.style.paddingLeft = hoverOriginalPaddingLeft;
          delete hoverTarget.dataset.gptBoostOrigPaddingLeft;
          const hoverOverlay = hoverTarget.querySelector("[data-gpt-boost-overlay]");
          if (hoverOverlay) hoverOverlay.remove();
        }
        const originalPaddingLeft = el.dataset.gptBoostOrigPaddingLeft || "";
        el.style.paddingLeft = originalPaddingLeft;
        delete el.dataset.gptBoostOrigPaddingLeft;
      }
    });

    document.querySelectorAll("[data-chatgpt-virtual-id]").forEach((el) => {
      el.removeAttribute("data-chatgpt-virtual-id");
      el.removeAttribute("data-gpt-boost-message-key");
    });
  }

  function startUrlWatcher() {
    setInterval(() => {
      if (window.location.href !== state.lastUrl) {
        state.lastUrl = window.location.href;
        log("URL changed → rebooting virtualizer");
        // Capture sidebar state before tearing down so we can restore it.
        const wasSidebarOpen = isSidebarOpen();
        const previousSidebarTab = activeSidebarTab;
        teardownVirtualizer();
        bootVirtualizer();
        // Re-open the sidebar to the same tab so outline/snippets refresh for
        // the new conversation instead of disappearing.
        if (wasSidebarOpen) {
          openSidebar(previousSidebarTab);
        }
      }
    }, config.URL_CHECK_INTERVAL);
  }

  // ---------------------------------------------------------------------------
  // Export public API
  // ---------------------------------------------------------------------------

  scroller.virtualizer = {
    bootVirtualizer,
    teardownVirtualizer,
    startUrlWatcher,
    handleResize,
    getStatsSnapshot,
    applyUiSettings,
    // Direct virtualizeNow bypass (no rAF) — used by the warmup poll in boot.js
    // to guard against requestAnimationFrame throttling in Firefox content scripts.
    forceVirtualize() {
      attachOrUpdateScrollListener();
      virtualizeNow();
    }
  };
})();
