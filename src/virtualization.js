import { isVirtualSpacerNode, getMessageRole, findConversationRoot, hasAnyMessages, isElementVisibleForConversation, getActiveConversationNodes, findScrollContainer } from './utils/dom.js';
import {
  currentConversationKey,
  persistedPinnedMessageKeys,
  persistedBookmarkedMessageKeys,
  scheduleFlagsSave,
  flushFlagsSave,
  loadPersistedFlagsForConversation,
  getArticleMessageKey,
  setCurrentConversationKey,
  getConversationStorageKey,
  loadFlagsStore,
  loadKnownConversationsStore,
  loadConversationDocumentsStore,
  summarizeConversationCaches,
  updateConversationMessageCount,
  syncConversationDocumentFromArticles,
  searchConversationDocuments,
  listWorkspaceConversations,
  buildCrossConversationMarksIndex,
  saveConversationNote,
  getConversationDisplayTitle,
  getConversationUrlFromKey
} from './core/storage.js';
import { createVirtualizerStore } from './core/virtualizer/store.ts';
import { setupScrollTracking, createDebouncedObserver } from './core/virtualizer/observer.ts';
import { createFeatureRegistry } from './core/runtime/featureRegistry.ts';
import { createServiceContainer } from './core/services/container.ts';
import { createVirtualizationEngine } from './core/runtime/virtualizationEngine.ts';
import { createLifecycleManager } from './core/runtime/lifecycleManager.ts';
import { createArticleRegistry } from './core/runtime/articleRegistry.js';
import { createFlagSyncManager } from './core/runtime/flagSync.js';
import { getThemeMode, getThemeTokens } from './ui/shell/theme.ts';
import { styleFloatingRoundControl } from './ui/shell/floatingControls.js';
import { createLayoutSettingsManager } from './ui/shell/layoutSettings.js';
import { createThemeApplier } from './ui/shell/themeApplier.js';
import { createLayoutOffsetsManager } from './ui/shell/layoutOffsets.js';
import { getRoleDisplayLabel, getRoleSurfaceStyle, createRoleChip } from './ui/features/roleStyles.ts';
import { renderSidebarSnippetsTab } from './ui/features/sidebar/snippetsTab.js';
import { createSidebarSettingsFeature } from './ui/features/sidebar/settingsFeature.js';
import { createSidebarShellFeature } from './ui/features/sidebar/shellFeature.js';
import { createBookmarksFeature } from './ui/features/bookmarks/bookmarksFeature.js';
import { createOutlineFeature } from './ui/features/outline/outlineFeature.js';
import { createArticleActionsFeature } from './ui/features/articleActions/articleActionsFeature.js';
import { createPinnedBarFeature } from './ui/features/pinned/pinnedBarFeature.js';
import { createScrollUiFeature } from './ui/features/scroll/scrollUiFeature.js';
import { createMarkdownExportFeature } from './ui/features/snippets/markdownExport.js';
import { hasCodeSnippetCandidateInElement } from './ui/features/snippets/codeSnippets.js';
import { createDownloadFeature } from './ui/features/download/downloadFeature.js';
import { createTokenGaugeFeature } from './ui/features/tokenGauge/tokenGaugeFeature.js';
import { createSearchFeature } from './ui/features/search/searchFeature.js';
import { createMinimapFeature } from './ui/features/minimap/minimapFeature.js';
import { createMapFeature } from './ui/features/map/mapFeature.js';
import { createMemoryFeature } from './ui/features/memory/memoryFeature.js';
import { createMarksFeature } from './ui/features/marks/marksFeature.js';
import { createInspectorFeature } from './ui/features/inspector/inspectorFeature.js';
import {
  DEFAULT_EXTENSION_SETTINGS,
  ROLE_THEME_PRESETS,
  DEFAULT_ROLE_THEME_KEY,
  CUSTOM_ROLE_THEME_KEY,
  normalizeExtensionSettings,
  normalizeColorHex,
  normalizeRoleThemeKey,
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
  let sidebarToggleButton = null;
  let sidebarPanel = null;
  let sidebarContentContainer = null;
  let activeMapVirtualId = null;
  let activeStandaloneMinimapVirtualId = null;
  let activeSidebarTab = "search";
  let themeApplier = null;
  let layoutOffsetsManager = null;
  let articleRegistry = null;
  let flagSyncManager = null;
  const searchState = {
    query: "",
    results: [],
    activeIndex: -1,
    indexedTotal: 0,
    matchCount: 0,
    resultVirtualIds: new Set()
  };
  let downloadButton = null;
  // codePanelButton/codePanelPanel were refactored into the sidebar snippets tab
  // in b232a91, but their call sites (applyThemeToUi, teardownVirtualizer, updateIndicator)
  // were not cleaned up. Keeping them as null guards prevents ReferenceErrors.
  let codePanelButton = null;
  let codePanelPanel = null;
  let tokenGaugeElement = null;
  let pinnedBarElement = null;
  let deferredVirtualizationTimer = null;
  let conversationDocumentSyncTimer = null;
  let minimapStructureRefreshTimer = null;
  let minimapSignalRefreshTimer = null;
  let codeSnippetVirtualIds = new Set();
  let codeSnippetSignalsReady = false;
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
  const MINIMAP_PANEL_RIGHT_OFFSET_PX = 0;
  const MINIMAP_PANEL_TOP_OFFSET_PX = 0;
  const MINIMAP_PANEL_WIDTH_PX = 24;
  const MINIMAP_PANEL_NEGATIVE_MARGIN_RIGHT_PX = 0;
  const MINIMAP_TRACK_HEIGHT_PX = window.innerHeight;
  const MINIMAP_CONTROL_CLEARANCE_PX = MINIMAP_PANEL_WIDTH_PX + 1;
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
  const CONVERSATION_DOCUMENT_SYNC_DEBOUNCE_MS = 320;
  const PENDING_CONVERSATION_JUMP_SESSION_KEY = "gptBoostPendingConversationJump";
  const MESSAGE_RAIL_OUTSIDE_LEFT_PX = -36;
  const MESSAGE_RAIL_INSIDE_LEFT_PX = 6;
  const MESSAGE_RAIL_INSIDE_PADDING_PX = 34;
  const MESSAGE_HOVER_EXTRA_PADDING_PX = 14;
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
    roleThemeKey: DEFAULT_ROLE_THEME_KEY,
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


  const ARTICLE_HOVER_HIGHLIGHT_SHADOW = "0 0 0 1px rgba(59,130,246,0.18)";

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
  const sidebarRefs = {};
  Object.defineProperties(sidebarRefs, {
    sidebarToggleButton: {
      get: () => sidebarToggleButton,
      set: (value) => { sidebarToggleButton = value; }
    },
    sidebarPanel: {
      get: () => sidebarPanel,
      set: (value) => { sidebarPanel = value; }
    },
    sidebarContentContainer: {
      get: () => sidebarContentContainer,
      set: (value) => { sidebarContentContainer = value; }
    },
    activeSidebarTab: {
      get: () => activeSidebarTab,
      set: (value) => { activeSidebarTab = value; }
    },
    hotkeyListenerBound: {
      get: () => hotkeyListenerBound,
      set: (value) => { hotkeyListenerBound = value; }
    },
    currentSidebarWidthPx: {
      get: () => currentSidebarWidthPx,
      set: (value) => { currentSidebarWidthPx = value; }
    }
  });
  const downloadRefs = {};
  Object.defineProperties(downloadRefs, {
    downloadButton: {
      get: () => downloadButton,
      set: (value) => { downloadButton = value; }
    }
  });
  const tokenGaugeRefs = {};
  Object.defineProperties(tokenGaugeRefs, {
    tokenGaugeElement: {
      get: () => tokenGaugeElement,
      set: (value) => { tokenGaugeElement = value; }
    }
  });
  const scrollUiRefs = {};
  Object.defineProperties(scrollUiRefs, {
    indicatorElement: {
      get: () => indicatorElement,
      set: (value) => { indicatorElement = value; }
    },
    scrollToTopButton: {
      get: () => scrollToTopButton,
      set: (value) => { scrollToTopButton = value; }
    },
    scrollToBottomButton: {
      get: () => scrollToBottomButton,
      set: (value) => { scrollToBottomButton = value; }
    }
  });
  const pinnedRefs = {};
  Object.defineProperties(pinnedRefs, {
    pinnedBarElement: {
      get: () => pinnedBarElement,
      set: (value) => { pinnedBarElement = value; }
    }
  });
  const layoutOffsetRefs = {};
  Object.defineProperties(layoutOffsetRefs, {
    sidebarPanel: { get: () => sidebarPanel },
    currentSidebarWidthPx: { get: () => currentSidebarWidthPx },
    indicatorElement: { get: () => indicatorElement },
    sidebarToggleButton: { get: () => sidebarToggleButton },
    searchButton: { get: () => searchButton },
    searchPanel: { get: () => searchPanel },
    downloadButton: { get: () => downloadButton },
    scrollToTopButton: { get: () => scrollToTopButton },
    scrollToBottomButton: { get: () => scrollToBottomButton },
    minimapPanel: { get: () => minimapPanel }
  });
  const runtimeRefs = {};
  Object.defineProperties(runtimeRefs, {
    activeSidebarTab: { get: () => activeSidebarTab },
    sidebarPanel: { get: () => sidebarPanel },
    sidebarContentContainer: { get: () => sidebarContentContainer },
    searchPanel: { get: () => searchPanel },
    minimapPanel: { get: () => minimapPanel },
    indicatorElement: { get: () => indicatorElement }
  });
  const themeRefs = {};
  Object.defineProperties(themeRefs, {
    searchButton: { get: () => searchButton },
    minimapButton: { get: () => minimapButton },
    codePanelButton: { get: () => codePanelButton },
    downloadButton: { get: () => downloadButton },
    sidebarToggleButton: { get: () => sidebarToggleButton },
    searchPrevButton: { get: () => searchPrevButton },
    searchNextButton: { get: () => searchNextButton },
    searchCloseButton: { get: () => searchCloseButton },
    searchPanel: { get: () => searchPanel },
    searchInput: { get: () => searchInput },
    searchCountPrimaryLabel: { get: () => searchCountPrimaryLabel },
    searchCountSecondaryLabel: { get: () => searchCountSecondaryLabel },
    minimapPanel: { get: () => minimapPanel },
    codePanelPanel: { get: () => codePanelPanel },
    sidebarPanel: { get: () => sidebarPanel }
  });

  const serviceContainer = createServiceContainer();
  const featureRegistry = createFeatureRegistry();

  function getRuntimeContext() {
    return {
      state,
      config,
      services: serviceContainer,
      refs: runtimeRefs
    };
  }

  function dispatchSidebarTabContent(tabId, container) {
    return featureRegistry.dispatchSidebarTabRender(tabId, container, getRuntimeContext());
  }

  function dispatchVisibilityUpdate(totalMessages, renderedMessages) {
    featureRegistry.dispatchVisibilityUpdate(
      totalMessages,
      renderedMessages,
      getRuntimeContext()
    );
  }

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
      escapeSelectorValue,
      onResultsChanged: scheduleMinimapSignalRefresh
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
      minimapPanelNegativeMarginRightPx: MINIMAP_PANEL_NEGATIVE_MARGIN_RIGHT_PX,
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
      getCodeSnippetVirtualIds,
      getSearchHitVirtualIds: () => searchFeature.getSearchResultVirtualIds(),
      applyFloatingUiOffsets,
      applyThemeToUi
    }
  });
  layoutOffsetsManager = createLayoutOffsetsManager({
    state,
    refs: layoutOffsetRefs,
    constants: {
      indicatorRightOffsetPx: INDICATOR_RIGHT_OFFSET_PX,
      sidebarToggleTopOffsetPx: SIDEBAR_TOGGLE_TOP_OFFSET_PX,
      sidebarToggleRightOffsetPx: SIDEBAR_TOGGLE_RIGHT_OFFSET_PX,
      sidebarToggleSizePx: SIDEBAR_TOGGLE_SIZE_PX,
      searchButtonGapPx: SEARCH_BUTTON_GAP_PX,
      searchButtonRightOffsetPx: SEARCH_BUTTON_RIGHT_OFFSET_PX,
      searchButtonSizePx: SEARCH_BUTTON_SIZE_PX,
      searchPanelRightOffsetPx: SEARCH_PANEL_RIGHT_OFFSET_PX,
      downloadButtonRightOffsetPx: DOWNLOAD_BUTTON_RIGHT_OFFSET_PX,
      downloadButtonSizePx: DOWNLOAD_BUTTON_SIZE_PX,
      downloadButtonGapPx: DOWNLOAD_BUTTON_GAP_PX,
      scrollButtonOffsetPx: SCROLL_BUTTON_OFFSET_PX,
      scrollButtonTopOffsetPx: SCROLL_BUTTON_TOP_OFFSET_PX,
      scrollButtonSizePx: SCROLL_BUTTON_SIZE_PX,
      minimapPanelWidthPx: MINIMAP_PANEL_WIDTH_PX,
      minimapControlClearancePx: MINIMAP_CONTROL_CLEARANCE_PX,
      sidebarTransitionMs: SIDEBAR_TRANSITION_MS
    },
    deps: {
      isSidebarOpen,
      applyMinimapFloatingLayout: (offset, topButtonTop, bottomButtonTop) =>
        minimapFeature.applyFloatingLayout(offset, topButtonTop, bottomButtonTop)
    }
  });

  const sidebarShellFeature = createSidebarShellFeature({
    refs: sidebarRefs,
    constants: {
      sidebarToggleRightOffsetPx: SIDEBAR_TOGGLE_RIGHT_OFFSET_PX,
      sidebarToggleTopOffsetPx: SIDEBAR_TOGGLE_TOP_OFFSET_PX,
      sidebarToggleSizePx: SIDEBAR_TOGGLE_SIZE_PX,
      sidebarTransitionMs: SIDEBAR_TRANSITION_MS,
      minSidebarWidthPx: 200,
      minViewportGapPx: 100
    },
    deps: {
      getThemeTokens,
      styleSearchButton,
      applyFloatingUiOffsets,
      applySidebarLayoutOffset,
      refreshArticleSideRailLayout,
      clearSearchHighlight,
      hideSearchPanel,
      applyThemeToUi,
      hotkeyMatchesKeyboardEvent,
      getSidebarHotkey: () => uiSettings.sidebarHotkey,
      getSidebarStatsSummary,
      getSidebarVersionLabel,
      renderSidebarTabContent: (tabId, container) => {
        if (!dispatchSidebarTabContent(tabId, container)) {
          renderSettingsTabContent(container);
        }
      },
      onMapTabActivated: () => updateMapViewportState(true),
      isEnabled: () => state.enabled
    }
  });

  const markdownExportFeature = createMarkdownExportFeature({ state });
  const bookmarksFeature = createBookmarksFeature({
    state,
    constants: {
      minimapPromptSnippetLength: MINIMAP_PROMPT_SNIPPET_LENGTH
    },
    deps: {
      getCurrentConversationKey: () => currentConversationKey,
      setCurrentConversationKey,
      getConversationStorageKey,
      getArticleMessageKey,
      getPersistedBookmarkedMessageKeys: () => persistedBookmarkedMessageKeys,
      scheduleFlagsSave,
      flushFlagsSave,
      updateBookmarkButtonAppearance,
      refreshSidebarTab,
      isMarksSidebarActive: () => isSidebarOpen() && activeSidebarTab === "marks",
      getThemeTokens,
      getMessageRole,
      getRoleSurfaceStyle,
      createRoleChip,
      scrollToVirtualId,
      openSidebar,
      toggleSidebar,
      updateSidebarVisibility
    }
  });
  const outlineFeature = createOutlineFeature({
    state,
    deps: {
      ensureVirtualIds,
      applyCollapseState,
      getThemeTokens,
      getMessageRole,
      getRoleSurfaceStyle,
      createRoleChip,
      scrollToVirtualId,
      togglePin,
      toggleBookmark,
      toggleCollapse,
      renderSidebarTab
    }
  });
  const memoryFeature = createMemoryFeature({
    deps: {
      getThemeTokens,
      loadWorkspaceMemory,
      openConversation,
      jumpToConversationMessage,
      getRoleSurfaceStyle,
      createRoleChip
    }
  });
  const marksFeature = createMarksFeature({
    deps: {
      getThemeTokens,
      loadCrossChatMarks,
      jumpToConversationMessage,
      getRoleSurfaceStyle,
      createRoleChip,
      renderSidebarTab
    }
  });
  const inspectorFeature = createInspectorFeature({
    state,
    deps: {
      getThemeTokens,
      getMessageRole,
      renderSidebarTab,
      loadConversationInspector,
      saveConversationNote: saveCurrentConversationNote
    }
  });
  const downloadFeature = createDownloadFeature({
    refs: downloadRefs,
    state,
    constants: {
      downloadButtonSizePx: DOWNLOAD_BUTTON_SIZE_PX,
      downloadButtonRightOffsetPx: DOWNLOAD_BUTTON_RIGHT_OFFSET_PX,
      downloadButtonTopOffsetPx: DOWNLOAD_BUTTON_TOP_OFFSET_PX
    },
    deps: {
      styleSearchButton,
      applyFloatingUiOffsets,
      applyThemeToUi,
      downloadMarkdown
    }
  });
  const tokenGaugeFeature = createTokenGaugeFeature({
    refs: tokenGaugeRefs,
    state,
    constants: {
      tokenGaugeMaxTokens: TOKEN_GAUGE_MAX_TOKENS,
      tokenGaugeYellowRatio: TOKEN_GAUGE_YELLOW_RATIO,
      tokenGaugeRedRatio: TOKEN_GAUGE_RED_RATIO
    }
  });
  const articleActionsFeature = createArticleActionsFeature({
    state,
    constants: {
      articleSnippetLength: ARTICLE_SNIPPET_LENGTH,
      articleHoverHighlightShadow: ARTICLE_HOVER_HIGHLIGHT_SHADOW,
      messageRailOutsideLeftPx: MESSAGE_RAIL_OUTSIDE_LEFT_PX,
      messageRailInsideLeftPx: MESSAGE_RAIL_INSIDE_LEFT_PX,
      messageRailInsidePaddingPx: MESSAGE_RAIL_INSIDE_PADDING_PX,
      messageHoverExtraPaddingPx: MESSAGE_HOVER_EXTRA_PADDING_PX
    },
    deps: {
      togglePin,
      toggleBookmark,
      refreshSidebarTab,
      getThemeTokens
    }
  });
  const layoutSettingsManager = createLayoutSettingsManager({
    config,
    defaultRoleColors: DEFAULT_ROLE_COLORS,
    getUiSettings: () => uiSettings
  });
  const sidebarSettingsFeature = createSidebarSettingsFeature({
    deps: {
      getSettingsStorageArea,
      getThemeTokens,
      state,
      config,
      getUiSettings: () => uiSettings,
      defaults: {
        sidebarHotkey: DEFAULT_SIDEBAR_HOTKEY,
        conversationPaddingPx: DEFAULT_CONVERSATION_PADDING_PX,
        composerWidthPx: DEFAULT_COMPOSER_WIDTH_PX,
        sidebarPanelWidthPx: SIDEBAR_PANEL_WIDTH_PX,
        roleThemeKey: DEFAULT_ROLE_THEME_KEY,
        roleThemePresets: ROLE_THEME_PRESETS,
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
        mutationDebounceMaxMs: MUTATION_DEBOUNCE_MAX_MS,
        customRoleThemeKey: CUSTOM_ROLE_THEME_KEY
      },
      helpers: {
        normalizeMargin,
        normalizeSidebarWidthPx,
        normalizeConversationPaddingPx,
        normalizeComposerWidthPx,
        normalizeScrollThrottleMs,
        normalizeMutationDebounceMs,
        normalizeSidebarHotkey,
        normalizeRoleThemeKey,
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
    }
  });
  const scrollUiFeature = createScrollUiFeature({
    refs: scrollUiRefs,
    state,
    constants: {
      scrollButtonOffsetPx: SCROLL_BUTTON_OFFSET_PX,
      scrollButtonSizePx: SCROLL_BUTTON_SIZE_PX,
      scrollButtonTopOffsetPx: SCROLL_BUTTON_TOP_OFFSET_PX,
      scrollBufferPx: SCROLL_BUFFER_PX,
      maxScrollAttempts: MAX_SCROLL_ATTEMPTS,
      scrollRetryDelayMs: SCROLL_RETRY_DELAY_MS,
      indicatorRightOffsetPx: INDICATOR_RIGHT_OFFSET_PX,
      indicatorBaseMinHeightPx: INDICATOR_BASE_MIN_HEIGHT_PX,
      indicatorMinOpacity: INDICATOR_MIN_OPACITY
    },
    deps: {
      getThemeTokens,
      getRoleSurfaceStyle,
      applyFloatingUiOffsets,
      applyThemeToUi,
      styleSearchButton
    }
  });
  const pinnedBarFeature = createPinnedBarFeature({
    refs: pinnedRefs,
    state,
    deps: {
      getThemeTokens,
      applyThemeToUi,
      togglePin,
      scrollToVirtualId
    }
  });
  themeApplier = createThemeApplier({
    refs: themeRefs,
    deps: {
      getThemeTokens,
      applyScrollTheme: (theme) => scrollUiFeature.applyTheme(theme),
      applyMinimapTheme: (theme) => minimapFeature.applyTheme(theme),
      applyPinnedTheme: (theme) => pinnedBarFeature.applyTheme(theme),
      applySidebarTheme: (theme) => sidebarShellFeature.applyTheme(theme),
      applyArticleActionsTheme: (theme) => articleActionsFeature.applyTheme(theme),
      dispatchThemeChanged: () => featureRegistry.dispatchThemeChanged(getRuntimeContext())
    }
  });

  function registerRuntimeServices() {
    serviceContainer.register("theme", {
      getMode: getThemeMode,
      getTokens: getThemeTokens
    });
    serviceContainer.register("sidebar", {
      isOpen: isSidebarOpen,
      open: openSidebar,
      close: hideSidebar,
      toggle: toggleSidebar,
      getActiveTab: () => activeSidebarTab,
      renderTab: renderSidebarTab
    });
    serviceContainer.register("viewport", {
      getMetrics: getViewportMetrics,
      getScrollTarget,
      getMaxScrollTop,
      scrollToVirtualId
    });
    serviceContainer.register("layout", {
      applyFloatingUiOffsets,
      applySidebarLayoutOffset,
      applyConversationLayoutSettings
    });
    serviceContainer.register("settings", {
      get: () => uiSettings,
      apply: applyUiSettings
    });
  }

  function registerRuntimeFeatures() {
    featureRegistry.register({
      id: "sidebar-tab-search",
      priority: 10,
      onSidebarTabRender: (tabId, container) => {
        if (tabId !== "search") return false;
        renderSearchTabContent(container);
        return true;
      }
    });
    featureRegistry.register({
      id: "sidebar-tab-memory",
      priority: 20,
      onSidebarTabRender: (tabId, container) => {
        if (tabId !== "memory") return false;
        renderMemoryTabContent(container);
        return true;
      }
    });
    featureRegistry.register({
      id: "sidebar-tab-marks",
      priority: 30,
      onSidebarTabRender: (tabId, container) => {
        if (tabId !== "marks") return false;
        renderBookmarksTabContent(container);
        return true;
      }
    });
    featureRegistry.register({
      id: "sidebar-tab-inspector",
      priority: 40,
      onSidebarTabRender: (tabId, container) => {
        if (tabId !== "inspector") return false;
        renderInspectorTabContent(container);
        return true;
      }
    });
    featureRegistry.register({
      id: "sidebar-tab-snippets",
      priority: 50,
      onSidebarTabRender: (tabId, container) => {
        if (tabId !== "snippets") return false;
        renderSnippetsTabContent(container);
        return true;
      }
    });
    featureRegistry.register({
      id: "sidebar-tab-settings",
      priority: 60,
      onSidebarTabRender: (tabId, container) => {
        if (tabId !== "settings") return false;
        renderSettingsTabContent(container);
        return true;
      }
    });
    featureRegistry.register({
      id: "visibility-search",
      priority: 70,
      onVisibilityUpdate: (totalMessages) => {
        updateSearchVisibility(totalMessages);
      }
    });
    featureRegistry.register({
      id: "visibility-minimap",
      priority: 80,
      onVisibilityUpdate: (totalMessages) => {
        updateMinimapVisibility(totalMessages);
      }
    });
    featureRegistry.register({
      id: "visibility-code-panel-legacy",
      priority: 90,
      onVisibilityUpdate: (totalMessages) => {
        updateCodePanelVisibility(totalMessages);
      }
    });
    featureRegistry.register({
      id: "visibility-download",
      priority: 100,
      onVisibilityUpdate: (totalMessages) => {
        updateDownloadVisibility(totalMessages);
      }
    });
    featureRegistry.register({
      id: "visibility-bookmarks",
      priority: 110,
      onVisibilityUpdate: (totalMessages) => {
        updateBookmarksVisibility(totalMessages);
      }
    });
    featureRegistry.register({
      id: "visibility-token-gauge",
      priority: 120,
      onVisibilityUpdate: () => {
        updateTokenGauge();
      }
    });
    featureRegistry.dispatchInit(getRuntimeContext());
  }

  registerRuntimeServices();
  registerRuntimeFeatures();
  flagSyncManager = createFlagSyncManager({
    state,
    persistedPinnedMessageKeys,
    persistedBookmarkedMessageKeys,
    deps: {
      getArticleMessageKey,
      scheduleFlagsSave,
      updatePinnedBar,
      updatePinButtonAppearance,
      updateBookmarkButtonAppearance,
      refreshSidebarTab
    }
  });
  const virtualizationEngine = createVirtualizationEngine({
    state,
    config,
    deps: {
      log,
      attachOrUpdateScrollListener,
      ensureVirtualIds,
      getActiveConversationNodes,
      getViewportMetrics,
      isVirtualSpacerNode,
      queueDeferredVirtualizationRetry,
      updateIndicator,
      hideAllUiElements,
      updateMapViewportState,
      updateStandaloneMinimapViewportState,
      refreshSidebarTab,
      populateMinimapPanel,
      getMinimapPanel: () => minimapPanel,
      dispatchStatsUpdated: () => {
        if (currentConversationKey && state.stats.totalMessages > 0) {
          updateConversationMessageCount(currentConversationKey, state.stats.totalMessages).catch(() => {});
        }
        scheduleConversationDocumentSync();
        refreshCodeSnippetVirtualIds();
        scheduleMinimapStructureRefresh();
        tryFulfillPendingConversationJump();
        featureRegistry.dispatchStatsUpdated(getRuntimeContext());
      },
      dispatchVirtualizeTick: () => featureRegistry.dispatchVirtualizeTick(getRuntimeContext())
    }
  });
  const lifecycleManager = createLifecycleManager({
    state,
    config,
    deps: {
      log,
      hasAnyMessages,
      findScrollContainer,
      setupScrollTracking,
      scheduleVirtualization,
      updateMapViewportState,
      updateStandaloneMinimapViewportState,
      isSidebarOpen,
      getCurrentSidebarWidthPx: () => currentSidebarWidthPx,
      applySidebarLayoutOffset,
      applyFloatingUiOffsets,
      refreshArticleSideRailLayout,
      applyThemeToUi,
      bindSidebarHotkey,
      applyRoleColorSettings,
      applyConversationLayoutSettings,
      findConversationRoot,
      createDebouncedObserver,
      setCurrentConversationKey,
      getConversationStorageKey,
      loadPersistedFlagsForConversation,
      syncFlagsFromPersistedKeys,
      dispatchBoot: () => featureRegistry.dispatchBoot(getRuntimeContext()),
      dispatchTeardown: () => featureRegistry.dispatchTeardown(getRuntimeContext()),
      virtualizeNow,
      clearDeferredVirtualizationTimer,
      cleanupUiState: teardownUiState,
      getActiveSidebarTab: () => activeSidebarTab,
      openSidebar
    }
  });
  articleRegistry = createArticleRegistry({
    state,
    deps: {
      getActiveConversationNodes,
      getArticleMessageKey,
      injectArticleUi,
      syncFlagsFromPersistedKeys
    }
  });

  function syncFlagsFromPersistedKeys() {
    if (!flagSyncManager) return;
    flagSyncManager.syncFlagsFromPersistedKeys();
  }

  // ---------------------------------------------------------------------------
  // Selectors
  // ---------------------------------------------------------------------------

  function isSidebarOpen() {
    return !!(sidebarPanel && sidebarPanel.getAttribute("data-open") === "true");
  }

  function applyFloatingUiOffsets() {
    if (!layoutOffsetsManager) return;
    layoutOffsetsManager.applyFloatingUiOffsets();
  }

  function applySidebarLayoutOffset(offsetPx, transitionMs = SIDEBAR_TRANSITION_MS) {
    if (!layoutOffsetsManager) return;
    layoutOffsetsManager.applySidebarLayoutOffset(offsetPx, transitionMs);
  }

  function clearMinimapStructureRefreshTimer() {
    if (minimapStructureRefreshTimer === null) return;
    clearTimeout(minimapStructureRefreshTimer);
    minimapStructureRefreshTimer = null;
  }

  function clearMinimapSignalRefreshTimer() {
    if (minimapSignalRefreshTimer === null) return;
    clearTimeout(minimapSignalRefreshTimer);
    minimapSignalRefreshTimer = null;
  }

  function refreshCodeSnippetVirtualIds() {
    ensureVirtualIds();
    const nextIds = new Set();
    state.articleMap.forEach((node, id) => {
      if (!(node instanceof HTMLElement)) return;
      if (hasCodeSnippetCandidateInElement(node)) {
        nextIds.add(id);
      }
    });
    codeSnippetVirtualIds = nextIds;
    codeSnippetSignalsReady = true;
  }

  function getCodeSnippetVirtualIds() {
    if (!codeSnippetSignalsReady && state.articleMap.size) {
      refreshCodeSnippetVirtualIds();
    }
    return codeSnippetVirtualIds;
  }

  function refreshVisibleMinimapStructure() {
    if (!minimapPanel || minimapPanel.style.display === "none") return;
    refreshCodeSnippetVirtualIds();
    populateMinimapPanel(minimapPanel);
  }

  function refreshVisibleMinimapSignals() {
    if (!minimapPanel || minimapPanel.style.display === "none") return;
    minimapFeature.refreshMinimapSignals();
  }

  function scheduleMinimapStructureRefresh() {
    clearMinimapStructureRefreshTimer();
    minimapStructureRefreshTimer = setTimeout(() => {
      minimapStructureRefreshTimer = null;
      refreshVisibleMinimapStructure();
    }, 90);
  }

  function scheduleMinimapSignalRefresh() {
    clearMinimapSignalRefreshTimer();
    minimapSignalRefreshTimer = setTimeout(() => {
      minimapSignalRefreshTimer = null;
      refreshVisibleMinimapSignals();
    }, 90);
  }

  function getActiveConversationTitle() {
    return String(document.title || "").trim();
  }

  function clearConversationDocumentSyncTimer() {
    if (conversationDocumentSyncTimer === null) return;
    clearTimeout(conversationDocumentSyncTimer);
    conversationDocumentSyncTimer = null;
  }

  async function syncCurrentConversationDocument() {
    if (!currentConversationKey) return null;
    ensureVirtualIds();
    if (!state.articleMap.size) return null;
    return syncConversationDocumentFromArticles({
      key: currentConversationKey,
      articleMap: state.articleMap,
      getArticleMessageKey,
      getMessageRole,
      title: getActiveConversationTitle(),
      origin: window.location.origin
    }).catch(() => null);
  }

  function scheduleConversationDocumentSync() {
    clearConversationDocumentSyncTimer();
    conversationDocumentSyncTimer = setTimeout(() => {
      conversationDocumentSyncTimer = null;
      void syncCurrentConversationDocument();
    }, CONVERSATION_DOCUMENT_SYNC_DEBOUNCE_MS);
  }

  function readPendingConversationJump() {
    try {
      const raw = sessionStorage.getItem(PENDING_CONVERSATION_JUMP_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  function savePendingConversationJump(conversationKey, messageKey = "") {
    try {
      sessionStorage.setItem(
        PENDING_CONVERSATION_JUMP_SESSION_KEY,
        JSON.stringify({
          conversationKey,
          messageKey,
          createdAt: Date.now()
        })
      );
    } catch (_error) {
      // Ignore session storage failures and fall back to conversation-level navigation.
    }
  }

  function clearPendingConversationJump() {
    try {
      sessionStorage.removeItem(PENDING_CONVERSATION_JUMP_SESSION_KEY);
    } catch (_error) {
      // Ignore session storage failures.
    }
  }

  function tryFulfillPendingConversationJump() {
    const pending = readPendingConversationJump();
    if (!pending || pending.conversationKey !== currentConversationKey) return false;
    if (!pending.messageKey) {
      clearPendingConversationJump();
      return false;
    }
    ensureVirtualIds();
    let targetVirtualId = "";
    state.articleMap.forEach((article, virtualId) => {
      if (targetVirtualId || !(article instanceof HTMLElement)) return;
      if (getArticleMessageKey(article, virtualId) === pending.messageKey) {
        targetVirtualId = virtualId;
      }
    });
    if (!targetVirtualId) return false;
    clearPendingConversationJump();
    scrollToVirtualId(targetVirtualId);
    return true;
  }

  function openConversation(conversationKey, messageKey = "") {
    const url = getConversationUrlFromKey(conversationKey, window.location.origin);
    if (!url) return;
    if (messageKey) {
      savePendingConversationJump(conversationKey, messageKey);
    } else {
      clearPendingConversationJump();
    }
    window.location.assign(url);
  }

  function jumpToConversationMessage(conversationKey, messageKey = "") {
    if (!conversationKey) return;
    if (conversationKey !== currentConversationKey) {
      openConversation(conversationKey, messageKey);
      return;
    }
    ensureVirtualIds();
    if (!messageKey) return;
    let targetVirtualId = "";
    state.articleMap.forEach((article, virtualId) => {
      if (targetVirtualId || !(article instanceof HTMLElement)) return;
      if (getArticleMessageKey(article, virtualId) === messageKey) {
        targetVirtualId = virtualId;
      }
    });
    if (targetVirtualId) {
      scrollToVirtualId(targetVirtualId);
    }
  }

  async function loadWorkspaceMemory(query = "") {
    const [flagsStore, knownStore, documentsStore] = await Promise.all([
      loadFlagsStore(),
      loadKnownConversationsStore(),
      loadConversationDocumentsStore()
    ]);
    return {
      conversations: listWorkspaceConversations({
        knownStore,
        documentsStore,
        flagsStore,
        currentConversationKey
      }),
      results: query
        ? searchConversationDocuments({
          documentsStore,
          knownStore,
          query,
          currentConversationKey
        })
        : []
    };
  }

  async function loadCrossChatMarks() {
    const [flagsStore, knownStore, documentsStore] = await Promise.all([
      loadFlagsStore(),
      loadKnownConversationsStore(),
      loadConversationDocumentsStore()
    ]);
    return buildCrossConversationMarksIndex({
      flagsStore,
      knownStore,
      documentsStore,
      currentConversationKey
    });
  }

  async function loadConversationInspector() {
    const [knownStore, documentsStore] = await Promise.all([
      loadKnownConversationsStore(),
      loadConversationDocumentsStore()
    ]);
    const knownEntry = knownStore[currentConversationKey] || {};
    const documentEntry = documentsStore[currentConversationKey] || {};
    return {
      title: getConversationDisplayTitle(currentConversationKey, documentEntry, knownEntry),
      note: knownEntry.note || "",
      visits: Number(knownEntry.visits || 0),
      lastSeenAt: knownEntry.lastSeenAt || documentEntry.updatedAt || "",
      messageCount: Number(knownEntry.messageCount || documentEntry.messageCount || 0),
      url: documentEntry.url || getConversationUrlFromKey(currentConversationKey, window.location.origin)
    };
  }

  async function saveCurrentConversationNote(note) {
    if (!currentConversationKey) return;
    await saveConversationNote(currentConversationKey, note);
    refreshSidebarMeta();
  }



  // ---------------------------------------------------------------------------
  // Core virtualization helpers
  // ---------------------------------------------------------------------------

  /**
   * Assign virtual IDs to visible <article> messages.
   */
  function ensureVirtualIds() {
    if (!articleRegistry) return;
    articleRegistry.ensureVirtualIds();
  }

  /**
   * Get viewport position/height for the scroll container.
   */
  function getViewportMetrics() {
    if (!articleRegistry) return { top: 0, height: window.innerHeight };
    return articleRegistry.getViewportMetrics();
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

  function clearDeferredVirtualizationTimer() {
    if (deferredVirtualizationTimer === null) return;
    clearTimeout(deferredVirtualizationTimer);
    deferredVirtualizationTimer = null;
  }

  function getScrollTarget() {
    return scrollUiFeature.getScrollTarget();
  }

  function getMaxScrollTop(scrollTarget) {
    return scrollUiFeature.getMaxScrollTop(scrollTarget);
  }

  function isScrollable(scrollTarget) {
    return scrollUiFeature.isScrollable(scrollTarget);
  }

  function ensureIndicatorElement() {
    return scrollUiFeature.ensureIndicatorElement();
  }

  function hideIndicator() {
    scrollUiFeature.hideIndicator();
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

  function ensureScrollButton(position) {
    return scrollUiFeature.ensureScrollButton(position);
  }

  function hideScrollButtons() {
    scrollUiFeature.hideScrollButtons();
  }

  function hideSearchUi() {
    searchFeature.hideSearchUi();
  }

  function updateScrollButtons(totalMessages) {
    void totalMessages;
    scrollUiFeature.updateScrollButtons();
  }

  function applyThemeToUi() {
    if (!themeApplier) return;
    themeApplier.applyThemeToUi();
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
    styleFloatingRoundControl(button, sizePx);
  }

  function normalizeMargin(value) {
    return layoutSettingsManager.normalizeMargin(value);
  }

  function applyRoleColorSettings() {
    layoutSettingsManager.applyRoleColorSettings();
  }

  function applyConversationLayoutSettings() {
    layoutSettingsManager.applyConversationLayoutSettings();
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
    return sidebarShellFeature.createSidebarTabButton(tabId, label, icon);
  }

  function renderSearchTabContent(container) {
    searchFeature.renderSearchTabContent(container);
  }

  function renderMemoryTabContent(container) {
    memoryFeature.render(container);
  }

  function renderBookmarksTabContent(container) {
    marksFeature.render(container);
  }

  function renderMapTabContent(container) {
    mapFeature.renderMapTabContent(container);
  }

  function renderInspectorTabContent(container) {
    inspectorFeature.render(container);
  }

  function renderSettingsTabContent(container) {
    sidebarSettingsFeature.render(container);
  }

  function renderSidebarTab(tabId) {
    sidebarShellFeature.renderSidebarTab(tabId);
  }

  function hideSidebar() {
    sidebarShellFeature.hideSidebar();
  }

  function openSidebar(tabId) {
    sidebarShellFeature.openSidebar(tabId);
  }

  function toggleSidebar(tabId) {
    sidebarShellFeature.toggleSidebar(tabId);
  }

  function bindSidebarHotkey() {
    sidebarShellFeature.bindSidebarHotkey();
  }

  function ensureSidebarToggleButton() {
    return sidebarShellFeature.ensureSidebarToggleButton();
  }

  function ensureSidebarPanel() {
    return sidebarShellFeature.ensureSidebarPanel();
  }

  function updateSidebarVisibility(totalMessages) {
    sidebarShellFeature.updateSidebarVisibility(totalMessages);
  }

  function refreshSidebarMeta() {
    sidebarShellFeature.refreshSidebarMeta();
  }

  function getSidebarStatsSummary() {
    const totalMessages = Math.max(0, Number(state.stats.totalMessages) || 0);
    const renderedMessages = Math.max(0, Number(state.stats.renderedMessages) || 0);
    const hiddenMessages = Math.max(0, totalMessages - renderedMessages);
    if (totalMessages <= 0) {
      return "No conversation messages detected";
    }
    return `${renderedMessages}/${totalMessages} rendered • ${hiddenMessages} hidden`;
  }

  let sidebarVersionLabelCache = null;

  function getSidebarVersionLabel() {
    if (sidebarVersionLabelCache !== null) {
      return sidebarVersionLabelCache;
    }

    let versionLabel = "Build unknown";

    try {
      const chromeObj =
        (typeof globalThis !== "undefined" && globalThis.chrome)
          ? globalThis.chrome
          : (typeof chrome !== "undefined" ? chrome : null);
      if (
        chromeObj &&
        chromeObj.runtime &&
        typeof chromeObj.runtime.getManifest === "function"
      ) {
        const manifest = chromeObj.runtime.getManifest();
        if (manifest && typeof manifest.version === "string") {
          versionLabel = `Build v${manifest.version}`;
        }
      }
    } catch (_error) {
      // Ignore errors and fall back to "Build unknown"
    }

    sidebarVersionLabelCache = versionLabel;
    return sidebarVersionLabelCache;
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
    return tokenGaugeFeature.ensureTokenGaugeElement();
  }

  function updateTokenGauge() {
    tokenGaugeFeature.updateTokenGauge();
  }

  // ---------------------------------------------------------------------------
  // Per-article UI (Collapse, Pin, Bookmark)
  // ---------------------------------------------------------------------------

  function setArticleActionIcon(btn, iconName) {
    articleActionsFeature.setArticleActionIcon(btn, iconName);
  }

  function createArticleActionButton(iconName, label) {
    return articleActionsFeature.createArticleActionButton(iconName, label);
  }

  function applyCollapseState(article, virtualId) {
    articleActionsFeature.applyCollapseState(article, virtualId);
  }

  function toggleCollapse(virtualId) {
    articleActionsFeature.toggleCollapse(virtualId);
  }

  function updatePinButtonAppearance(article, virtualId) {
    articleActionsFeature.updatePinButtonAppearance(article, virtualId);
  }

  function updateBookmarkButtonAppearance(article, virtualId) {
    articleActionsFeature.updateBookmarkButtonAppearance(article, virtualId);
  }

  function getArticleHoverTarget(article) {
    return articleActionsFeature.getArticleHoverTarget(article);
  }

  function getDirectChildAncestor(container, node) {
    return articleActionsFeature.getDirectChildAncestor(container, node);
  }

  function getArticleNativeActionRows(article) {
    return articleActionsFeature.getArticleNativeActionRows(article);
  }

  function injectArticleUi(article, virtualId) {
    articleActionsFeature.injectArticleUi(article, virtualId);
  }

  function updateArticleSideRailLayout(article, sideRail) {
    articleActionsFeature.updateArticleSideRailLayout(article, sideRail);
  }

  function refreshArticleSideRailLayout() {
    articleActionsFeature.refreshArticleSideRailLayout();
  }

  // ---------------------------------------------------------------------------
  // Pin to Top
  // ---------------------------------------------------------------------------

  function scrollToVirtualId(virtualId, attemptOrOptions = 0) {
    const options =
      typeof attemptOrOptions === "object" && attemptOrOptions !== null
        ? attemptOrOptions
        : null;
    const attempt =
      typeof attemptOrOptions === "number"
        ? attemptOrOptions
        : 0;
    const allowRetry = options?.allowRetry !== false;
    const behavior = options?.behavior || "smooth";
    const block = options?.block || "center";
    const selectorId = escapeSelectorValue(virtualId);
    const target = document.querySelector(`[data-virtual-id="${selectorId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior, block });
    scheduleVirtualization();

    if (allowRetry && attempt < MAX_SCROLL_ATTEMPTS) {
      setTimeout(() => {
        scrollToVirtualId(virtualId, attempt + 1);
      }, SCROLL_RETRY_DELAY_MS);
    }
  }

  function ensurePinnedBar() {
    return pinnedBarFeature.ensurePinnedBar();
  }

  function updatePinnedBar() {
    pinnedBarFeature.updatePinnedBar();
  }

  function togglePin(virtualId) {
    if (!currentConversationKey) {
      setCurrentConversationKey(getConversationStorageKey());
    }
    let article = state.articleMap.get(virtualId);
    if (!(article instanceof HTMLElement)) {
      const selectorId = escapeSelectorValue(virtualId);
      const liveArticle = document.querySelector(`[data-virtual-id="${selectorId}"]`);
      if (liveArticle instanceof HTMLElement) {
        article = liveArticle;
        state.articleMap.set(virtualId, liveArticle);
      }
    }
    const key = article instanceof HTMLElement ? getArticleMessageKey(article, virtualId) : `virtual:${virtualId}`;
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
    if (isSidebarOpen() && activeSidebarTab === "marks") {
      void flushFlagsSave().finally(() => {
        refreshSidebarTab();
      });
    } else {
      refreshSidebarTab();
    }
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
    markdownExportFeature.downloadMarkdown();
  }

  function convertDomToMarkdown(node) {
    return markdownExportFeature.convertDomToMarkdown(node);
  }

  function extractMarkdownPartsFromMessage(messageRoot) {
    return markdownExportFeature.extractMarkdownPartsFromMessage(messageRoot);
  }

  function ensureDownloadButton() {
    return downloadFeature.ensureDownloadButton();
  }

  function updateDownloadVisibility(totalMessages) {
    downloadFeature.updateDownloadVisibility(totalMessages);
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
    bookmarksFeature.toggleBookmark(virtualId);
  }

  function hideBookmarksPanel() {
    bookmarksFeature.hideBookmarksPanel();
  }

  function hideBookmarksUi() {
    bookmarksFeature.hideBookmarksUi();
  }

  function populateBookmarksPanel(panel) {
    bookmarksFeature.populateBookmarksPanel(panel);
  }

  function showBookmarksPanel() {
    bookmarksFeature.showBookmarksPanel();
  }

  function toggleBookmarksPanel() {
    bookmarksFeature.toggleBookmarksPanel();
  }

  function ensureBookmarksButton() {
    return bookmarksFeature.ensureBookmarksButton();
  }

  function ensureBookmarksPanel() {
    return bookmarksFeature.ensureBookmarksPanel();
  }

  function updateBookmarksVisibility(totalMessages) {
    bookmarksFeature.updateBookmarksVisibility(totalMessages);
  }

  function updateIndicator(totalMessages, renderedMessages) {
    if (!state.enabled) {
      hideAllUiElements();
      return;
    }

    dispatchVisibilityUpdate(totalMessages, renderedMessages);
    refreshSidebarMeta();
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
    virtualizationEngine.convertArticleToSpacer(articleElement);
  }

  function convertSpacerToArticle(spacerElement) {
    virtualizationEngine.convertSpacerToArticle(spacerElement);
  }

  function updateStats() {
    virtualizationEngine.updateStats();
  }

  function virtualizeNow() {
    virtualizationEngine.virtualizeNow();
  }

  function scheduleVirtualization() {
    virtualizationEngine.scheduleVirtualization();
  }

  function getStatsSnapshot() {
    return virtualizationEngine.getStatsSnapshot();
  }

  // ---------------------------------------------------------------------------
  // Main: boot, teardown, URL watcher
  // ---------------------------------------------------------------------------

  function attachOrUpdateScrollListener() {
    lifecycleManager.attachOrUpdateScrollListener();
  }

  function handleResize() {
    lifecycleManager.handleResize();
  }

  function bootVirtualizer() {
    lifecycleManager.bootVirtualizer();
  }

  function teardownVirtualizer() {
    lifecycleManager.teardownVirtualizer();
  }

  function teardownUiState() {
    // Restore all original elements before clearing the map so React can unmount them cleanly.
    document
      .querySelectorAll('div[data-chatgpt-virtual-spacer="1"]')
      .forEach((spacer) => convertSpacerToArticle(spacer));

    state.articleMap.clear();
    state.nextVirtualId = 1;
    state.emptyVirtualizationRetryCount = 0;

    scrollUiFeature.teardown();

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
    clearConversationDocumentSyncTimer();
    clearMinimapStructureRefreshTimer();
    clearMinimapSignalRefreshTimer();
    codeSnippetVirtualIds = new Set();
    codeSnippetSignalsReady = false;
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

    articleActionsFeature.cleanupInjectedUi();

    document.querySelectorAll("[data-chatgpt-virtual-id]").forEach((el) => {
      el.removeAttribute("data-chatgpt-virtual-id");
      el.removeAttribute("data-gpt-boost-message-key");
    });
  }

  function startUrlWatcher() {
    lifecycleManager.startUrlWatcher();
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
