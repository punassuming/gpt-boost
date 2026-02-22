// virtualization.js
(function initializeVirtualizationModule() {
  const scroller = window.ChatGPTVirtualScroller;
  const config = scroller.config;
  const state = scroller.state;
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
  let activeSidebarTab = "search";
  let sidebarExpanded = false;
  let settingsEnabledInput = null;
  let settingsDebugInput = null;
  let settingsMarginInput = null;
  const searchState = {
    query: "",
    results: [],
    activeIndex: -1,
    indexedTotal: 0,
    matchCount: 0
  };
  let codePanelButton = null;
  let codePanelPanel = null;
  let downloadButton = null;
  let bookmarksButton = null;
  let bookmarksPanel = null;
  let tokenGaugeElement = null;
  let pinnedBarElement = null;
  let deferredVirtualizationTimer = null;
  const SCROLL_BUTTON_SIZE_PX = 30;
  const SCROLL_BUTTON_OFFSET_PX = 12;
  const TOP_BUTTON_STACK_OFFSET_PX = 56;
  const DEFERRED_VIRTUALIZATION_DELAY_MS = 120;
  const MAX_EMPTY_RETRY_COUNT = 8;
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
  const MINIMAP_PANEL_RIGHT_OFFSET_PX =
    MINIMAP_BUTTON_RIGHT_OFFSET_PX + MINIMAP_BUTTON_SIZE_PX + MINIMAP_BUTTON_GAP_PX;
  const MINIMAP_PANEL_TOP_OFFSET_PX = MINIMAP_BUTTON_TOP_OFFSET_PX;
  const MINIMAP_PANEL_WIDTH_PX = 280;
  const MINIMAP_PROMPT_SNIPPET_LENGTH = 60;
  const SEARCH_BUTTON_SIZE_PX = 30;
  const SEARCH_BUTTON_GAP_PX = 8;
  const SEARCH_BUTTON_RIGHT_OFFSET_PX = SCROLL_BUTTON_OFFSET_PX;
  const SEARCH_BUTTON_TOP_OFFSET_PX =
    MINIMAP_BUTTON_TOP_OFFSET_PX +
    MINIMAP_BUTTON_SIZE_PX +
    MINIMAP_BUTTON_GAP_PX;
  const CODE_PANEL_BUTTON_SIZE_PX = 30;
  const CODE_PANEL_BUTTON_GAP_PX = 8;
  const CODE_PANEL_BUTTON_RIGHT_OFFSET_PX = SCROLL_BUTTON_OFFSET_PX;
  const CODE_PANEL_BUTTON_TOP_OFFSET_PX =
    SEARCH_BUTTON_TOP_OFFSET_PX +
    SEARCH_BUTTON_SIZE_PX +
    SEARCH_BUTTON_GAP_PX;
  const CODE_PANEL_PANEL_RIGHT_OFFSET_PX =
    CODE_PANEL_BUTTON_RIGHT_OFFSET_PX + CODE_PANEL_BUTTON_SIZE_PX + CODE_PANEL_BUTTON_GAP_PX;
  const CODE_PANEL_PANEL_TOP_OFFSET_PX = CODE_PANEL_BUTTON_TOP_OFFSET_PX;
  const CODE_PANEL_PANEL_WIDTH_PX = 520;
  const DOWNLOAD_BUTTON_SIZE_PX = 30;
  const DOWNLOAD_BUTTON_GAP_PX = 8;
  const DOWNLOAD_BUTTON_RIGHT_OFFSET_PX = SCROLL_BUTTON_OFFSET_PX;
  const DOWNLOAD_BUTTON_TOP_OFFSET_PX =
    CODE_PANEL_BUTTON_TOP_OFFSET_PX +
    CODE_PANEL_BUTTON_SIZE_PX +
    CODE_PANEL_BUTTON_GAP_PX;
  const BOOKMARKS_BUTTON_SIZE_PX = 30;
  const BOOKMARKS_BUTTON_GAP_PX = 8;
  const BOOKMARKS_BUTTON_RIGHT_OFFSET_PX = SCROLL_BUTTON_OFFSET_PX;
  const BOOKMARKS_BUTTON_TOP_OFFSET_PX =
    DOWNLOAD_BUTTON_TOP_OFFSET_PX +
    DOWNLOAD_BUTTON_SIZE_PX +
    DOWNLOAD_BUTTON_GAP_PX;
  const BOOKMARKS_PANEL_RIGHT_OFFSET_PX =
    BOOKMARKS_BUTTON_RIGHT_OFFSET_PX + BOOKMARKS_BUTTON_SIZE_PX + BOOKMARKS_BUTTON_GAP_PX;
  const BOOKMARKS_PANEL_TOP_OFFSET_PX = BOOKMARKS_BUTTON_TOP_OFFSET_PX;
  const BOOKMARKS_PANEL_WIDTH_PX = 280;
  const SCROLL_BUTTON_TOP_OFFSET_PX =
    BOOKMARKS_BUTTON_TOP_OFFSET_PX +
    BOOKMARKS_BUTTON_SIZE_PX +
    BOOKMARKS_BUTTON_GAP_PX;
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
  const SIDEBAR_PANEL_EXPANDED_WIDTH_PX = 560;
  const SIDEBAR_PANEL_TOP_OFFSET_PX = SIDEBAR_TOGGLE_TOP_OFFSET_PX;
  const SIDEBAR_PANEL_RIGHT_OFFSET_PX = SIDEBAR_TOGGLE_RIGHT_OFFSET_PX + SIDEBAR_TOGGLE_SIZE_PX + 8;
  const MESSAGE_FLAGS_STORAGE_KEY = "messageFlagsByConversation";
  const MESSAGE_FLAGS_SAVE_DEBOUNCE_MS = 200;
  const ARTICLE_HOVER_HIGHLIGHT_SHADOW = "inset 0 0 0 1px rgba(59,130,246,0.35)";
  let currentConversationKey = "";
  let persistedPinnedMessageKeys = new Set();
  let persistedBookmarkedMessageKeys = new Set();
  let saveFlagsTimer = null;
  let flagsStoreCache = null;

  function getExtensionStorageArea() {
    if (typeof chrome !== "undefined" && chrome.storage) {
      return chrome.storage.local || chrome.storage.sync || null;
    }
    return null;
  }

  function extensionStorageGet(key) {
    const area = getExtensionStorageArea();
    if (!area) return Promise.resolve({});
    return new Promise((resolve) => {
      area.get(key, (result) => resolve(result || {}));
    });
  }

  function extensionStorageSet(payload) {
    const area = getExtensionStorageArea();
    if (!area) return Promise.resolve();
    return new Promise((resolve) => {
      area.set(payload, () => resolve());
    });
  }

  async function loadFlagsStore() {
    if (flagsStoreCache) return flagsStoreCache;
    const result = await extensionStorageGet(MESSAGE_FLAGS_STORAGE_KEY);
    const store = result[MESSAGE_FLAGS_STORAGE_KEY];
    flagsStoreCache = store && typeof store === "object" ? store : {};
    return flagsStoreCache;
  }

  function getConversationStorageKey() {
    const match = window.location.pathname.match(/\/c\/([^/?#]+)/);
    if (match && match[1]) return `chat:${match[1]}`;
    return "";
  }

  function getArticleMessageKey(article, virtualId) {
    if (article.dataset.gptBoostMessageKey) {
      return article.dataset.gptBoostMessageKey;
    }

    const nestedMessageEl = article.querySelector("[data-message-id]");
    const candidate = (
      article.getAttribute("data-message-id") ||
      article.getAttribute("id") ||
      article.getAttribute("data-testid") ||
      (nestedMessageEl && nestedMessageEl.getAttribute("data-message-id")) ||
      `virtual:${virtualId}`
    ).trim();

    article.dataset.gptBoostMessageKey = candidate;
    return candidate;
  }

  function syncFlagsFromPersistedKeys() {
    const nextPinned = new Set();
    const nextBookmarked = new Set();

    state.articleMap.forEach((article, virtualId) => {
      if (!(article instanceof HTMLElement)) return;
      const key = getArticleMessageKey(article, virtualId);
      if (persistedPinnedMessageKeys.has(key)) nextPinned.add(virtualId);
      if (persistedBookmarkedMessageKeys.has(key)) nextBookmarked.add(virtualId);
    });

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
    refreshSidebarTab();
  }

  async function loadPersistedFlagsForConversation() {
    currentConversationKey = getConversationStorageKey();
    if (!currentConversationKey) {
      persistedPinnedMessageKeys = new Set();
      persistedBookmarkedMessageKeys = new Set();
      syncFlagsFromPersistedKeys();
      return;
    }
    const store = await loadFlagsStore();
    const conversationFlags = store[currentConversationKey] || {};
    const pinned = Array.isArray(conversationFlags.pinned) ? conversationFlags.pinned : [];
    const bookmarked = Array.isArray(conversationFlags.bookmarked) ? conversationFlags.bookmarked : [];
    persistedPinnedMessageKeys = new Set(pinned);
    persistedBookmarkedMessageKeys = new Set(bookmarked);
    syncFlagsFromPersistedKeys();
  }

  async function saveFlagsToStorage() {
    if (!currentConversationKey) return;
    const store = await loadFlagsStore();
    const pinned = Array.from(persistedPinnedMessageKeys);
    const bookmarked = Array.from(persistedBookmarkedMessageKeys);

    if (!pinned.length && !bookmarked.length) {
      delete store[currentConversationKey];
    } else {
      store[currentConversationKey] = { pinned, bookmarked };
    }

    await extensionStorageSet({ [MESSAGE_FLAGS_STORAGE_KEY]: store });
  }

  function scheduleFlagsSave() {
    if (saveFlagsTimer !== null) {
      clearTimeout(saveFlagsTimer);
    }
    saveFlagsTimer = setTimeout(() => {
      saveFlagsTimer = null;
      saveFlagsToStorage().catch(() => {});
    }, MESSAGE_FLAGS_SAVE_DEBOUNCE_MS);
  }

  // ---------------------------------------------------------------------------
  // Selectors
  // ---------------------------------------------------------------------------

  function getThemeMode() {
    const root = document.documentElement;
    if (root && root.classList.contains("dark")) return "dark";
    if (root && root.classList.contains("light")) return "light";
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }

  function getThemeTokens() {
    const mode = getThemeMode();
    if (mode === "dark") {
      return {
        text: "#f8fafc",
        mutedText: "rgba(248, 250, 252, 0.7)",
        panelBg: "rgba(15, 23, 42, 0.92)",
        panelBorder: "rgba(148, 163, 184, 0.25)",
        panelShadow: "0 8px 20px rgba(2, 6, 23, 0.55)",
        inputBg: "rgba(2, 6, 23, 0.6)",
        inputBorder: "rgba(148, 163, 184, 0.35)",
        buttonBg: "rgba(148, 163, 184, 0.22)",
        buttonText: "#e2e8f0",
        buttonShadow: "0 6px 16px rgba(2, 6, 23, 0.5)",
        buttonMutedBg: "rgba(148, 163, 184, 0.18)",
        buttonMutedText: "#e2e8f0",
        indicatorBg: "rgba(148, 163, 184, 0.55)",
        indicatorShadow: "0 4px 10px rgba(2, 6, 23, 0.4)"
      };
    }

    return {
      text: "#0f172a",
      mutedText: "rgba(15, 23, 42, 0.6)",
      panelBg: "rgba(255, 255, 255, 0.97)",
      panelBorder: "rgba(15, 23, 42, 0.12)",
      panelShadow: "0 8px 20px rgba(15, 23, 42, 0.18)",
      inputBg: "rgba(241, 245, 249, 0.95)",
      inputBorder: "rgba(148, 163, 184, 0.55)",
      buttonBg: "rgba(15, 23, 42, 0.78)",
      buttonText: "#f8fafc",
      buttonShadow: "0 6px 16px rgba(15, 23, 42, 0.2)",
      buttonMutedBg: "rgba(15, 23, 42, 0.12)",
      buttonMutedText: "#0f172a",
      indicatorBg: "rgba(15, 23, 42, 0.6)",
      indicatorShadow: "0 4px 10px rgba(15, 23, 42, 0.18)"
    };
  }

  /**
   * Find the main conversation root element.
   *
   * @returns {HTMLElement}
   */
  function findConversationRoot() {
    const selectors = [
      'main[class*="conversation" i]',
      '[role="main"]',
      "main",
      '[class*="thread" i]',
      '[class*="conversation" i]'
    ];

    for (const selector of selectors) {
      const root = document.querySelector(selector);
      if (root instanceof HTMLElement) {
        log("Found conversation root via selector:", selector);
        return root;
      }
    }

    log("Conversation root not found via selectors; using <body>");
    return document.body;
  }

  /** @returns {boolean} */
  function hasAnyMessages() {
    return !!document.querySelector(config.ARTICLE_SELECTOR);
  }

  /**
   * Find the scrollable container for the conversation.
   *
   * @returns {HTMLElement | Window}
   */
  function findScrollContainer() {
    const firstMessage = document.querySelector(config.ARTICLE_SELECTOR);

    if (firstMessage instanceof HTMLElement) {
      let ancestor = firstMessage.parentElement;
      while (
        ancestor &&
        ancestor !== document.body &&
        ancestor !== document.documentElement
      ) {
        const styles = getComputedStyle(ancestor);
        const overflowY = styles.overflowY;
        const isScrollable =
          (overflowY === "auto" || overflowY === "scroll") &&
          ancestor.scrollHeight > ancestor.clientHeight + 10;

        if (isScrollable) {
          log(
            "Found scroll container from ancestor:",
            ancestor.tagName,
            ancestor.className
          );
          return ancestor;
        }
        ancestor = ancestor.parentElement;
      }
    }

    if (state.conversationRoot) {
      if (
        state.conversationRoot.scrollHeight >
        state.conversationRoot.clientHeight + 10
      ) {
        log("Using conversation root as scroll container");
        return state.conversationRoot;
      }
    }

    const docScroll =
      document.scrollingElement || document.documentElement || document.body;

    log("Using document.scrollingElement as scroll container");
    return docScroll;
  }

  // ---------------------------------------------------------------------------
  // Core virtualization helpers
  // ---------------------------------------------------------------------------

  /**
   * Assign virtual IDs to visible <article> messages.
   */
  function ensureVirtualIds() {
    const articleList = document.querySelectorAll(config.ARTICLE_SELECTOR);

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
    element.setAttribute("data-chatgpt-virtual-indicator", "1");
    element.style.position = "fixed";
    element.style.right = `${INDICATOR_RIGHT_OFFSET_PX}px`;
    element.style.top = "50%";
    element.style.transform = "translateY(-50%)";
    element.style.zIndex = "9999";
    element.style.display = "none";
    element.style.width = "6px";
    element.style.height = `${INDICATOR_BASE_MIN_HEIGHT_PX}px`;
    element.style.borderRadius = "999px";
    element.style.background = "rgba(17, 24, 39, 0.6)";
    element.style.boxShadow = "0 4px 10px rgba(15, 23, 42, 0.18)";
    element.style.opacity = String(INDICATOR_MIN_OPACITY);
    element.style.pointerEvents = "none";
    element.style.userSelect = "none";
    element.setAttribute("aria-label", "Virtualizing messages");
    document.body.appendChild(element);
    indicatorElement = element;
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
    button.style.zIndex = "9999";
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

    applyThemeToUi();
    return button;
  }

  function hideScrollButtons() {
    if (scrollToTopButton) scrollToTopButton.style.display = "none";
    if (scrollToBottomButton) scrollToBottomButton.style.display = "none";
  }

  function hideSearchUi() {
    if (searchButton) searchButton.style.display = "none";
    hideSearchPanel();
  }

  function updateScrollButtons(totalMessages) {
    if (!state.enabled || totalMessages === 0) {
      hideScrollButtons();
      return;
    }

    const scrollTarget = getScrollTarget();

    if (!scrollTarget) {
      hideScrollButtons();
      return;
    }

    if (!isScrollable(scrollTarget)) {
      hideScrollButtons();
      return;
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
      indicatorElement.style.background = theme.indicatorBg;
      indicatorElement.style.boxShadow = theme.indicatorShadow;
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
      minimapPanel.style.background = theme.panelBg;
      minimapPanel.style.boxShadow = theme.panelShadow;
      minimapPanel.style.border = `1px solid ${theme.panelBorder}`;
      minimapPanel.style.color = theme.text;
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
    if (!element) return;
    const marks = element.querySelectorAll(
      'mark[data-chatgpt-virtual-search="hit"]'
    );
    marks.forEach((mark) => {
      const textNode = document.createTextNode(mark.textContent || "");
      mark.replaceWith(textNode);
    });
    element.normalize();
  }

  function clearSearchHighlight() {
    if (highlightedSearchElement) {
      clearSearchTextHighlights(highlightedSearchElement);
      highlightedSearchElement.style.outline = "";
      highlightedSearchElement.style.outlineOffset = "";
      highlightedSearchElement.style.borderRadius = "";
      highlightedSearchElement = null;
    }
  }

  function highlightMatchesInElement(element, query) {
    if (!(element instanceof HTMLElement)) return;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;

    clearSearchTextHighlights(element);

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          const parent = node.parentElement;
          if (
            parent &&
            parent.closest('mark[data-chatgpt-virtual-search="hit"]')
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
      const text = node.nodeValue || "";
      const lower = text.toLowerCase();
      let index = lower.indexOf(normalized);
      if (index === -1) return;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      while (index !== -1) {
        if (index > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.slice(lastIndex, index))
          );
        }

        const matchText = text.slice(index, index + normalized.length);
        const mark = document.createElement("mark");
        mark.dataset.chatgptVirtualSearch = "hit";
        mark.textContent = matchText;
        mark.style.background = "rgba(251, 191, 36, 0.35)";
        mark.style.color = "inherit";
        mark.style.padding = "0 2px";
        mark.style.borderRadius = "4px";
        fragment.appendChild(mark);

        lastIndex = index + normalized.length;
        index = lower.indexOf(normalized, lastIndex);
      }

      if (lastIndex < text.length) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex))
        );
      }

      node.replaceWith(fragment);
    });
  }

  function setSearchHighlight(element) {
    if (!(element instanceof HTMLElement)) return;
    clearSearchHighlight();
    element.style.outline = "2px solid #fbbf24";
    element.style.outlineOffset = "2px";
    element.style.borderRadius = "8px";
    highlightMatchesInElement(element, searchState.query);
    highlightedSearchElement = element;
  }

  function updateSearchCountLabel() {
    if (!searchCountLabel) return;
    const totalSections = searchState.results.length;
    const active =
      totalSections && searchState.activeIndex >= 0
        ? searchState.activeIndex + 1
        : 0;
    const primaryText = `${active}/${totalSections}`;
    const secondaryText = `${searchState.matchCount} match${
      searchState.matchCount === 1 ? "" : "es"
    }`;

    if (searchCountPrimaryLabel && searchCountSecondaryLabel) {
      searchCountPrimaryLabel.textContent = primaryText;
      searchCountSecondaryLabel.textContent = secondaryText;
      return;
    }

    searchCountLabel.textContent = `${primaryText} • ${searchState.matchCount}`;
  }

  function collectSearchTargets() {
    ensureVirtualIds();
    const entries = new Map();

    document.querySelectorAll(config.ARTICLE_SELECTOR).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const id = node.dataset.virtualId;
      if (!id) return;
      entries.set(id, node);
    });

    state.articleMap.forEach((node, id) => {
      if (!(node instanceof HTMLElement)) return;
      entries.set(id, node);
    });

    return entries;
  }

  function getSearchResultSummary(id, index, total) {
    const node = state.articleMap.get(id);
    if (!(node instanceof HTMLElement)) {
      return {
        title: `Result ${index + 1}`,
        subtitle: `Message ${id} • ${index + 1}/${total}`
      };
    }
    const textSource = node.querySelector("[data-message-author-role]") || node;
    const role = textSource instanceof HTMLElement
      ? (textSource.getAttribute("data-message-author-role") || "message")
      : "message";
    const raw = (textSource.textContent || "").trim().replace(/\s+/g, " ");
    const snippet = raw.length > 120 ? raw.slice(0, 120) + "…" : raw;
    return {
      title: snippet || `Message ${id}`,
      subtitle: `${role} • #${id} • ${index + 1}/${total}`
    };
  }

  function focusSearchResult(id) {
    const selectorId = escapeSelectorValue(id);
    const target = document.querySelector(
      `[data-virtual-id="${selectorId}"]`
    );
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    scheduleVirtualization();

    setTimeout(() => {
      const refreshed =
        document.querySelector(`article[data-virtual-id="${selectorId}"]`) ||
        document.querySelector(`[data-virtual-id="${selectorId}"]`);
      if (refreshed instanceof HTMLElement) {
        setSearchHighlight(refreshed);
      }
    }, 200);
  }

  function runSearch(query) {
    const normalized = query.trim().toLowerCase();
    searchState.query = query;

    if (!normalized) {
      searchState.results = [];
      searchState.activeIndex = -1;
      searchState.indexedTotal = state.stats.totalMessages;
      searchState.matchCount = 0;
      updateSearchCountLabel();
      clearSearchHighlight();
      return;
    }

    const entries = collectSearchTargets();
    const results = [];
    let matchCount = 0;

    entries.forEach((node, id) => {
      const text = (node.textContent || "").toLowerCase();
      if (!text) return;
      let index = text.indexOf(normalized);
      if (index === -1) return;
      results.push(id);
      while (index !== -1) {
        matchCount += 1;
        index = text.indexOf(normalized, index + normalized.length);
      }
    });

    searchState.results = results;
    searchState.activeIndex = results.length ? 0 : -1;
    searchState.indexedTotal = state.stats.totalMessages;
    searchState.matchCount = matchCount;

    updateSearchCountLabel();
    if (!results.length) {
      clearSearchHighlight();
    }
    refreshSidebarTab();
  }

  function scheduleSearch(query) {
    if (searchDebounceTimer !== null) {
      clearTimeout(searchDebounceTimer);
    }
    searchDebounceTimer = setTimeout(() => {
      searchDebounceTimer = null;
      runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
  }

  function ensureSearchResultsFresh() {
    if (!searchState.query) return;
    if (searchState.indexedTotal !== state.stats.totalMessages) {
      runSearch(searchState.query);
    }
  }

  function navigateSearch(direction) {
    ensureSearchResultsFresh();
    const results = searchState.results;
    if (!results.length) {
      updateSearchCountLabel();
      return;
    }

    let nextIndex =
      typeof searchState.activeIndex === "number"
        ? searchState.activeIndex
        : -1;
    nextIndex = (nextIndex + direction + results.length) % results.length;
    searchState.activeIndex = nextIndex;
    updateSearchCountLabel();
    focusSearchResult(results[nextIndex]);
  }

  function showSearchPanel() {
    const panel = ensureSearchPanel();
    if (!panel) return;
    panel.style.display = "flex";
    updateSearchCountLabel();
    if (searchInput) searchInput.focus();
  }

  function hideSearchPanel() {
    if (searchPanel) searchPanel.style.display = "none";
    clearSearchHighlight();
  }

  function toggleSearchPanel() {
    const sidebarVisible = !!(sidebarPanel && sidebarPanel.style.display !== "none");
    if (sidebarVisible) {
      openSidebar("search");
      return;
    }
    const panel = ensureSearchPanel();
    if (!panel) return;
    const isVisible = panel.style.display !== "none";
    if (isVisible) {
      hideSearchPanel();
    } else {
      showSearchPanel();
    }
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

  function getSettingsStorageArea() {
    return (typeof chrome !== "undefined" && chrome.storage)
      ? (chrome.storage.sync || chrome.storage.local || null)
      : null;
  }

  function normalizeMargin(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return config.DEFAULT_MARGIN_PX;
    return Math.min(config.MAX_MARGIN_PX, Math.max(config.MIN_MARGIN_PX, Math.round(parsed)));
  }

  function refreshSidebarTab() {
    if (!sidebarContentContainer || !sidebarPanel || sidebarPanel.style.display === "none") return;
    renderSidebarTab(activeSidebarTab);
  }

  function createSidebarTabButton(tabId, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.padding = "6px 8px";
    btn.style.fontSize = "11px";
    btn.style.cursor = "pointer";
    btn.style.fontFamily = "inherit";
    btn.style.background = "transparent";
    btn.style.color = "inherit";
    btn.dataset.gptBoostSidebarTab = tabId;
    btn.addEventListener("click", () => openSidebar(tabId));
    return btn;
  }

  function renderSearchTabContent(container) {
    const theme = getThemeTokens();
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "6px";
    row.style.alignItems = "center";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search chat...";
    input.setAttribute("aria-label", "Search chat");
    input.style.flex = "1";
    input.style.minWidth = "0";
    input.style.height = "32px";
    input.style.borderRadius = "8px";
    input.style.padding = "0 10px";
    input.style.fontSize = "12px";
    input.style.fontFamily = "inherit";
    input.style.background = theme.inputBg;
    input.style.border = `1px solid ${theme.inputBorder}`;
    input.style.color = theme.text;
    input.value = searchState.query || "";
    input.addEventListener("input", (event) => scheduleSearch(event.target.value));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        navigateSearch(event.shiftKey ? -1 : 1);
      }
    });

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.textContent = "↑";
    styleSearchButton(prevBtn, 24);
    prevBtn.style.display = "flex";
    prevBtn.style.background = theme.buttonMutedBg;
    prevBtn.style.color = theme.buttonMutedText;
    prevBtn.addEventListener("click", () => navigateSearch(-1));

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.textContent = "↓";
    styleSearchButton(nextBtn, 24);
    nextBtn.style.display = "flex";
    nextBtn.style.background = theme.buttonMutedBg;
    nextBtn.style.color = theme.buttonMutedText;
    nextBtn.addEventListener("click", () => navigateSearch(1));

    row.appendChild(input);
    row.appendChild(prevBtn);
    row.appendChild(nextBtn);

    const count = document.createElement("div");
    count.style.fontSize = "11px";
    count.style.opacity = "0.8";
    count.style.padding = "2px 2px 6px";

    const totalSections = searchState.results.length;
    const active = totalSections && searchState.activeIndex >= 0 ? searchState.activeIndex + 1 : 0;
    count.textContent = `${active}/${totalSections} sections • ${searchState.matchCount} matches`;

    container.appendChild(row);
    container.appendChild(count);

    const resultsList = document.createElement("div");
    resultsList.style.display = "flex";
    resultsList.style.flexDirection = "column";
    resultsList.style.gap = "6px";
    resultsList.style.overflowY = "auto";
    resultsList.style.minHeight = "0";
    resultsList.style.flex = "1";

    if (!searchState.results.length) {
      const empty = document.createElement("div");
      empty.style.fontSize = "12px";
      empty.style.opacity = "0.7";
      empty.style.padding = "4px 2px";
      empty.textContent = searchState.query ? "No matches found." : "Type to search the conversation.";
      resultsList.appendChild(empty);
    } else {
      const total = searchState.results.length;
      searchState.results.forEach((id, idx) => {
        const summary = getSearchResultSummary(id, idx, total);
        const item = document.createElement("button");
        item.type = "button";
        item.style.textAlign = "left";
        item.style.border = `1px solid ${theme.panelBorder}`;
        item.style.borderRadius = "10px";
        item.style.padding = "8px";
        item.style.background = idx === searchState.activeIndex ? theme.buttonMutedBg : "transparent";
        item.style.color = theme.text;
        item.style.cursor = "pointer";
        item.style.fontFamily = "inherit";
        item.style.display = "flex";
        item.style.flexDirection = "column";
        item.style.gap = "4px";
        item.addEventListener("click", () => {
          searchState.activeIndex = idx;
          updateSearchCountLabel();
          focusSearchResult(id);
          renderSidebarTab("search");
        });

        const title = document.createElement("div");
        title.textContent = summary.title;
        title.style.fontSize = "12px";
        title.style.lineHeight = "1.35";
        title.style.wordBreak = "break-word";

        const subtitle = document.createElement("div");
        subtitle.textContent = summary.subtitle;
        subtitle.style.fontSize = "10px";
        subtitle.style.opacity = "0.72";

        item.appendChild(title);
        item.appendChild(subtitle);
        resultsList.appendChild(item);
      });
    }

    container.appendChild(resultsList);

    searchInput = input;
    searchPrevButton = prevBtn;
    searchNextButton = nextBtn;
    searchCountLabel = count;
    searchCountPrimaryLabel = null;
    searchCountSecondaryLabel = null;
    searchCloseButton = null;
    setTimeout(() => input.focus(), 0);
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

      const item = document.createElement("div");
      item.style.border = `1px solid ${theme.panelBorder}`;
      item.style.borderRadius = "10px";
      item.style.padding = "6px 8px";
      item.style.display = "flex";
      item.style.flexDirection = "column";
      item.style.gap = "6px";
      item.style.background = "rgba(148,163,184,0.06)";

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

      item.appendChild(title);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  function renderSettingsTabContent(container) {
    const storage = getSettingsStorageArea();
    const row = (labelText, inputEl) => {
      const wrap = document.createElement("label");
      wrap.style.display = "flex";
      wrap.style.alignItems = "center";
      wrap.style.justifyContent = "space-between";
      wrap.style.gap = "10px";
      wrap.style.fontSize = "12px";
      wrap.style.padding = "6px 0";
      const txt = document.createElement("span");
      txt.textContent = labelText;
      wrap.appendChild(txt);
      wrap.appendChild(inputEl);
      return wrap;
    };

    const enabledInput = document.createElement("input");
    enabledInput.type = "checkbox";
    enabledInput.checked = !!state.enabled;
    enabledInput.addEventListener("change", () => {
      state.enabled = enabledInput.checked;
      if (storage) storage.set({ enabled: state.enabled });
      scheduleVirtualization();
      updateSidebarVisibility(state.stats.totalMessages);
    });

    const debugInput = document.createElement("input");
    debugInput.type = "checkbox";
    debugInput.checked = !!state.debug;
    debugInput.addEventListener("change", () => {
      state.debug = debugInput.checked;
      if (storage) storage.set({ debug: state.debug });
    });

    const marginInput = document.createElement("input");
    marginInput.type = "number";
    marginInput.min = String(config.MIN_MARGIN_PX);
    marginInput.max = String(config.MAX_MARGIN_PX);
    marginInput.value = String(config.MARGIN_PX);
    marginInput.style.width = "110px";
    marginInput.addEventListener("change", () => {
      const next = normalizeMargin(marginInput.value);
      marginInput.value = String(next);
      config.MARGIN_PX = next;
      if (storage) storage.set({ marginPx: next });
      scheduleVirtualization();
    });

    settingsEnabledInput = enabledInput;
    settingsDebugInput = debugInput;
    settingsMarginInput = marginInput;

    container.appendChild(row("Enable Virtual Scrolling", enabledInput));
    container.appendChild(row("Debug Mode", debugInput));
    container.appendChild(row("Virtualization Margin", marginInput));
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
      tab.style.background = isActive ? getThemeTokens().buttonMutedBg : "transparent";
    });

    if (tabId === "search") renderSearchTabContent(sidebarContentContainer);
    else if (tabId === "bookmarks") renderBookmarksTabContent(sidebarContentContainer);
    else if (tabId === "outline") renderOutlineTabContent(sidebarContentContainer);
    else renderSettingsTabContent(sidebarContentContainer);
  }

  function hideSidebar() {
    if (!sidebarPanel) return;
    sidebarPanel.style.display = "none";
    clearSearchHighlight();
  }

  function applySidebarSize() {
    if (!sidebarPanel) return;
    const width = sidebarExpanded ? SIDEBAR_PANEL_EXPANDED_WIDTH_PX : SIDEBAR_PANEL_WIDTH_PX;
    sidebarPanel.style.width = `${width}px`;
    const expandBtn = sidebarPanel.querySelector('[data-gpt-boost-sidebar-action="expand"]');
    if (expandBtn instanceof HTMLElement) {
      expandBtn.textContent = sidebarExpanded ? "↤" : "↔";
      expandBtn.setAttribute("aria-label", sidebarExpanded ? "Collapse sidebar width" : "Expand sidebar width");
    }
  }

  function openSidebar(tabId) {
    const panel = ensureSidebarPanel();
    if (!panel) return;
    hideSearchPanel();
    panel.style.display = "flex";
    renderSidebarTab(tabId || activeSidebarTab);
    applyThemeToUi();
  }

  function toggleSidebar(tabId) {
    const panel = ensureSidebarPanel();
    if (!panel) return;
    const requested = tabId || activeSidebarTab;
    if (panel.style.display !== "none" && requested === activeSidebarTab) {
      hideSidebar();
      return;
    }
    openSidebar(requested);
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
    button.style.zIndex = "9999";
    button.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";
    styleSearchButton(button, SIDEBAR_TOGGLE_SIZE_PX);
    button.style.display = "none";
    button.textContent = "☰";
    button.addEventListener("click", () => toggleSidebar(activeSidebarTab));
    document.body.appendChild(button);
    sidebarToggleButton = button;
    return button;
  }

  function ensureSidebarPanel() {
    if (sidebarPanel && sidebarPanel.isConnected) return sidebarPanel;
    if (!document.body) return null;
    const theme = getThemeTokens();

    const panel = document.createElement("div");
    panel.setAttribute("data-gpt-boost-sidebar", "panel");
    panel.style.position = "fixed";
    panel.style.top = `${SIDEBAR_PANEL_TOP_OFFSET_PX}px`;
    panel.style.right = `${SIDEBAR_PANEL_RIGHT_OFFSET_PX}px`;
    panel.style.zIndex = "9999";
    panel.style.width = `${SIDEBAR_PANEL_WIDTH_PX}px`;
    panel.style.maxWidth = "min(92vw, 520px)";
    panel.style.maxHeight = `calc(100vh - ${SIDEBAR_PANEL_TOP_OFFSET_PX + 16}px)`;
    panel.style.display = "none";
    panel.style.flexDirection = "column";
    panel.style.gap = "8px";
    panel.style.padding = "10px";
    panel.style.borderRadius = "14px";
    panel.style.background = theme.panelBg;
    panel.style.boxShadow = theme.panelShadow;
    panel.style.border = `1px solid ${theme.panelBorder}`;
    panel.style.color = theme.text;
    panel.style.backdropFilter = "blur(6px)";
    panel.style.boxSizing = "border-box";
    panel.style.overflow = "hidden";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "8px";

    const title = document.createElement("div");
    title.textContent = "Tools";
    title.style.fontSize = "12px";
    title.style.fontWeight = "600";
    title.style.opacity = "0.9";

    const headerActions = document.createElement("div");
    headerActions.style.display = "flex";
    headerActions.style.gap = "6px";

    const expandBtn = document.createElement("button");
    expandBtn.type = "button";
    expandBtn.dataset.gptBoostSidebarAction = "expand";
    styleSearchButton(expandBtn, 22);
    expandBtn.style.display = "flex";
    expandBtn.style.background = "rgba(148, 163, 184, 0.2)";
    expandBtn.addEventListener("click", () => {
      sidebarExpanded = !sidebarExpanded;
      applySidebarSize();
    });

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close sidebar");
    styleSearchButton(closeBtn, 22);
    closeBtn.style.display = "flex";
    closeBtn.style.background = "rgba(148, 163, 184, 0.2)";
    closeBtn.addEventListener("click", hideSidebar);

    headerActions.appendChild(expandBtn);
    headerActions.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(headerActions);

    const tabs = document.createElement("div");
    tabs.style.display = "grid";
    tabs.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
    tabs.style.gap = "6px";

    tabs.appendChild(createSidebarTabButton("search", "Search"));
    tabs.appendChild(createSidebarTabButton("bookmarks", "Bookmarks"));
    tabs.appendChild(createSidebarTabButton("outline", "Outline"));
    tabs.appendChild(createSidebarTabButton("settings", "Settings"));

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
    applySidebarSize();
    return panel;
  }

  function updateSidebarVisibility(totalMessages) {
    const shouldShow = state.enabled && totalMessages > 0;
    const button = ensureSidebarToggleButton();
    if (!button) return;
    button.style.display = shouldShow ? "flex" : "none";
    if (!shouldShow) hideSidebar();
  }

  function ensureSearchButton() {
    if (searchButton && searchButton.isConnected) {
      return searchButton;
    }

    if (!document.body) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-chatgpt-virtual-search", "toggle");
    button.style.position = "fixed";
    button.style.right = `${SEARCH_BUTTON_RIGHT_OFFSET_PX}px`;
    button.style.top = `${SEARCH_BUTTON_TOP_OFFSET_PX}px`;
    button.style.zIndex = "9999";
    button.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.style.width = "14px";
    icon.style.height = "14px";
    icon.style.fill = "currentColor";
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M15.5 14h-.79l-.28-.27a6 6 0 1 0-.71.71l.27.28v.79l4.25 4.25 1.5-1.5L15.5 14Zm-5.5 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
    );
    icon.appendChild(path);
    button.appendChild(icon);
    button.setAttribute("aria-label", "Search chat messages");
    styleSearchButton(button, SEARCH_BUTTON_SIZE_PX);
    button.style.display = "none";
    button.addEventListener("click", toggleSearchPanel);

    document.body.appendChild(button);
    searchButton = button;
    applyThemeToUi();
    return button;
  }

  function ensureSearchPanel() {
    if (searchPanel && searchPanel.isConnected) {
      return searchPanel;
    }

    if (!document.body) return null;

    const panel = document.createElement("div");
    panel.setAttribute("data-chatgpt-virtual-search", "panel");
    panel.style.position = "fixed";
    panel.style.top = `${SEARCH_PANEL_TOP_OFFSET_PX}px`;
    panel.style.right = `${SEARCH_PANEL_RIGHT_OFFSET_PX}px`;
    panel.style.zIndex = "9999";
    panel.style.width = `${SEARCH_PANEL_WIDTH_PX}px`;
    panel.style.display = "none";
    panel.style.flexDirection = "column";
    panel.style.alignItems = "stretch";
    panel.style.gap = "8px";
    panel.style.padding = "10px";
    panel.style.borderRadius = "14px";
    panel.style.background = "rgba(15, 23, 42, 0.92)";
    panel.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.28)";
    panel.style.color = "#f9fafb";
    panel.style.backdropFilter = "blur(6px)";

    const inputRow = document.createElement("div");
    inputRow.style.display = "flex";
    inputRow.style.alignItems = "center";
    inputRow.style.gap = "6px";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search chat...";
    input.setAttribute("aria-label", "Search chat");
    input.style.flex = "1";
    input.style.minWidth = "0";
    input.style.height = "28px";
    input.style.border = "1px solid rgba(148, 163, 184, 0.35)";
    input.style.outline = "none";
    input.style.background = "rgba(15, 23, 42, 0.6)";
    input.style.color = "#f9fafb";
    input.style.fontSize = "12px";
    input.style.fontFamily = "inherit";
    input.style.borderRadius = "8px";
    input.style.padding = "0 8px";
    input.style.boxSizing = "border-box";
    input.addEventListener("input", (event) => {
      scheduleSearch(event.target.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        navigateSearch(event.shiftKey ? -1 : 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        hideSearchPanel();
      }
    });

    const count = document.createElement("div");
    count.style.display = "flex";
    count.style.flexDirection = "column";
    count.style.alignItems = "flex-start";
    count.style.justifyContent = "center";
    count.style.gap = "2px";
    count.style.opacity = "0.85";
    count.style.minWidth = "80px";
    count.style.textAlign = "left";

    const countPrimary = document.createElement("span");
    countPrimary.textContent = "0/0";
    countPrimary.style.fontSize = "11px";
    countPrimary.style.fontWeight = "600";
    countPrimary.style.lineHeight = "1.1";
    countPrimary.style.display = "block";

    const countSecondary = document.createElement("span");
    countSecondary.textContent = "0 matches";
    countSecondary.style.fontSize = "10px";
    countSecondary.style.lineHeight = "1.1";
    countSecondary.style.display = "block";
    countSecondary.style.opacity = "0.9";

    count.appendChild(countPrimary);
    count.appendChild(countSecondary);

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.textContent = "↑";
    prevButton.setAttribute("aria-label", "Previous match");
    styleSearchButton(prevButton, 22);
    prevButton.style.display = "flex";
    prevButton.style.background = "rgba(148, 163, 184, 0.2)";
    prevButton.addEventListener("click", () => navigateSearch(-1));

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.textContent = "↓";
    nextButton.setAttribute("aria-label", "Next match");
    styleSearchButton(nextButton, 22);
    nextButton.style.display = "flex";
    nextButton.style.background = "rgba(148, 163, 184, 0.2)";
    nextButton.addEventListener("click", () => navigateSearch(1));

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close search");
    styleSearchButton(closeButton, 22);
    closeButton.style.display = "flex";
    closeButton.style.background = "rgba(148, 163, 184, 0.2)";
    closeButton.addEventListener("click", hideSearchPanel);

    const sidebarButton = document.createElement("button");
    sidebarButton.type = "button";
    sidebarButton.textContent = "⇱";
    sidebarButton.setAttribute("aria-label", "Open search in sidebar");
    styleSearchButton(sidebarButton, 22);
    sidebarButton.style.display = "flex";
    sidebarButton.style.background = "rgba(148, 163, 184, 0.2)";
    sidebarButton.addEventListener("click", () => {
      hideSearchPanel();
      openSidebar("search");
    });

    const controlsRow = document.createElement("div");
    controlsRow.style.display = "flex";
    controlsRow.style.alignItems = "center";
    controlsRow.style.justifyContent = "space-between";
    controlsRow.style.gap = "8px";

    const navGroup = document.createElement("div");
    navGroup.style.display = "flex";
    navGroup.style.alignItems = "center";
    navGroup.style.gap = "6px";
    navGroup.appendChild(prevButton);
    navGroup.appendChild(nextButton);

    inputRow.appendChild(input);
    inputRow.appendChild(sidebarButton);
    inputRow.appendChild(closeButton);

    controlsRow.appendChild(count);
    controlsRow.appendChild(navGroup);

    panel.appendChild(inputRow);
    panel.appendChild(controlsRow);

    document.body.appendChild(panel);

    searchPanel = panel;
    searchInput = input;
    searchPrevButton = prevButton;
    searchNextButton = nextButton;
    searchCountLabel = count;
    searchCountPrimaryLabel = countPrimary;
    searchCountSecondaryLabel = countSecondary;
    searchCloseButton = closeButton;
    applyThemeToUi();
    return panel;
  }

  function updateSearchVisibility(totalMessages) {
    const shouldShow = state.enabled && totalMessages > 0;
    const button = ensureSearchButton();
    if (button) button.style.display = shouldShow ? "flex" : "none";
    if (!shouldShow) hideSearchPanel();
    updateSidebarVisibility(totalMessages);
  }

  // ---------------------------------------------------------------------------
  // Minimap (conversation outline)
  // ---------------------------------------------------------------------------

  function hideMinimapPanel() {
    if (minimapPanel) minimapPanel.style.display = "none";
  }

  function hideMinimapUi() {
    if (minimapButton) minimapButton.style.display = "none";
    hideMinimapPanel();
  }

  function buildMinimapItems() {
    const items = [];
    const sortedEntries = Array.from(state.articleMap.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    for (const [id, node] of sortedEntries) {
      const userEl = node.querySelector('[data-message-author-role="user"]');
      if (!userEl) {
        const testId = node.getAttribute("data-testid") || "";
        const match = testId.match(/conversation-turn-(\d+)/);
        if (!match || Number(match[1]) % 2 === 0) continue;
      }
      const textSource = userEl || node;
      const text = (textSource.textContent || "").trim().replace(/\s+/g, " ");
      if (!text) continue;
      const snippet = text.length > MINIMAP_PROMPT_SNIPPET_LENGTH
        ? text.slice(0, MINIMAP_PROMPT_SNIPPET_LENGTH) + "…"
        : text;
      items.push({ id, snippet });
    }
    return items;
  }

  function scrollToMinimapItem(virtualId) {
    hideMinimapPanel();
    const selectorId = escapeSelectorValue(virtualId);
    const target = document.querySelector(`[data-virtual-id="${selectorId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    scheduleVirtualization();
  }

  function populateMinimapPanel(panel) {
    const listContainer = panel.querySelector(
      '[data-chatgpt-minimap="list"]'
    );
    if (!listContainer) return;

    listContainer.innerHTML = "";
    const items = buildMinimapItems();
    const theme = getThemeTokens();

    if (!items.length) {
      const empty = document.createElement("div");
      empty.style.fontSize = "12px";
      empty.style.opacity = "0.6";
      empty.style.padding = "4px 2px";
      empty.textContent = "No user prompts found.";
      listContainer.appendChild(empty);
      return;
    }

    items.forEach(({ id, snippet }, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = `${index + 1}. ${snippet}`;
      item.style.display = "block";
      item.style.width = "100%";
      item.style.textAlign = "left";
      item.style.background = "transparent";
      item.style.border = "none";
      item.style.borderRadius = "8px";
      item.style.padding = "6px 8px";
      item.style.fontSize = "12px";
      item.style.lineHeight = "1.4";
      item.style.cursor = "pointer";
      item.style.color = theme.text;
      item.style.wordBreak = "break-word";
      item.style.fontFamily = "inherit";
      item.addEventListener("mouseenter", () => {
        item.style.background = theme.buttonMutedBg;
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "transparent";
      });
      item.addEventListener("click", () => scrollToMinimapItem(id));
      listContainer.appendChild(item);
    });
  }

  function showMinimapPanel() {
    openSidebar("outline");
  }

  function toggleMinimapPanel() {
    toggleSidebar("outline");
  }

  function ensureMinimapButton() {
    if (minimapButton && minimapButton.isConnected) {
      return minimapButton;
    }
    if (!document.body) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-chatgpt-minimap", "toggle");
    button.style.position = "fixed";
    button.style.right = `${MINIMAP_BUTTON_RIGHT_OFFSET_PX}px`;
    button.style.top = `${MINIMAP_BUTTON_TOP_OFFSET_PX}px`;
    button.style.zIndex = "9999";
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
    button.setAttribute("aria-label", "Open conversation outline");
    styleSearchButton(button, MINIMAP_BUTTON_SIZE_PX);
    button.style.display = "none";
    button.addEventListener("click", toggleMinimapPanel);

    document.body.appendChild(button);
    minimapButton = button;
    applyThemeToUi();
    return button;
  }

  function ensureMinimapPanel() {
    if (minimapPanel && minimapPanel.isConnected) {
      return minimapPanel;
    }
    if (!document.body) return null;

    const panel = document.createElement("div");
    panel.setAttribute("data-chatgpt-minimap", "panel");
    panel.style.position = "fixed";
    panel.style.top = `${MINIMAP_PANEL_TOP_OFFSET_PX}px`;
    panel.style.right = `${MINIMAP_PANEL_RIGHT_OFFSET_PX}px`;
    panel.style.zIndex = "9999";
    panel.style.width = `${MINIMAP_PANEL_WIDTH_PX}px`;
    panel.style.maxHeight = `calc(100vh - ${MINIMAP_PANEL_TOP_OFFSET_PX + 16}px)`;
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
    title.textContent = "Conversation Outline";
    title.style.fontSize = "12px";
    title.style.fontWeight = "600";
    title.style.lineHeight = "1.2";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close outline");
    styleSearchButton(closeButton, 22);
    closeButton.style.display = "flex";
    closeButton.style.background = "rgba(148, 163, 184, 0.2)";
    closeButton.addEventListener("click", hideMinimapPanel);

    header.appendChild(title);
    header.appendChild(closeButton);

    const listContainer = document.createElement("div");
    listContainer.setAttribute("data-chatgpt-minimap", "list");
    listContainer.style.overflowY = "auto";
    listContainer.style.display = "flex";
    listContainer.style.flexDirection = "column";
    listContainer.style.gap = "2px";

    panel.appendChild(header);
    panel.appendChild(listContainer);

    document.body.appendChild(panel);
    minimapPanel = panel;
    applyThemeToUi();
    return panel;
  }

  function updateMinimapVisibility(totalMessages) {
    if (minimapButton) minimapButton.style.display = "none";
    updateSidebarVisibility(totalMessages);
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
    const overlay = article.querySelector("[data-gpt-boost-overlay]");
    const collapseBtn = overlay && overlay.querySelector("[data-gpt-boost-collapse-btn]");

    if (contentArea) {
      contentArea.style.display = isCollapsed ? "none" : "";
    }
    if (snippet) {
      snippet.style.display = isCollapsed ? "block" : "none";
    }
    if (collapseBtn) {
      setArticleActionIcon(collapseBtn, isCollapsed ? "expand" : "collapse");
      collapseBtn.setAttribute("aria-label", isCollapsed ? "Expand message" : "Collapse message");
    }
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

    const overlay = document.createElement("div");
    overlay.setAttribute("data-gpt-boost-overlay", "1");
    overlay.style.position = "absolute";
    overlay.style.top = "6px";
    overlay.style.right = "8px";
    overlay.style.display = "none";
    overlay.style.flexDirection = "row";
    overlay.style.gap = "3px";
    overlay.style.zIndex = "100";
    overlay.style.alignItems = "center";

    const collapseBtn = createArticleActionButton("collapse", "Collapse message");
    collapseBtn.setAttribute("data-gpt-boost-collapse-btn", "1");
    collapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCollapse(virtualId);
    });

    overlay.appendChild(collapseBtn);
    article.appendChild(overlay);

    const sideRail = document.createElement("div");
    sideRail.setAttribute("data-gpt-boost-side-rail", "1");
    sideRail.style.position = "absolute";
    sideRail.style.left = `${MESSAGE_RAIL_OUTSIDE_LEFT_PX}px`;
    sideRail.style.top = "50%";
    sideRail.style.transform = "translateY(-50%)";
    sideRail.style.display = "flex";
    sideRail.style.flexDirection = "column";
    sideRail.style.gap = "4px";
    sideRail.style.zIndex = "101";
    sideRail.style.alignItems = "center";
    sideRail.style.padding = "2px";
    sideRail.style.borderRadius = "8px";
    sideRail.style.background = "rgba(15,23,42,0.15)";
    sideRail.style.opacity = "0.92";
    sideRail.style.transition = "background 0.15s ease, opacity 0.15s ease";

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

    sideRail.appendChild(pinBtn);
    sideRail.appendChild(bookmarkBtn);
    article.appendChild(sideRail);
    updateArticleSideRailLayout(article, sideRail);

    article.addEventListener("mouseenter", () => {
      overlay.style.display = "flex";
      article.style.boxShadow = ARTICLE_HOVER_HIGHLIGHT_SHADOW;
      sideRail.style.background = "rgba(59,130,246,0.2)";
      sideRail.style.opacity = "1";
    });
    article.addEventListener("mouseleave", () => {
      overlay.style.display = "none";
      article.style.boxShadow = "";
      sideRail.style.background = "rgba(15,23,42,0.15)";
      sideRail.style.opacity = "0.92";
    });

    const snippet = document.createElement("div");
    snippet.setAttribute("data-gpt-boost-snippet", "1");
    snippet.style.display = "none";
    snippet.style.fontSize = "13px";
    snippet.style.opacity = "0.65";
    snippet.style.overflow = "hidden";
    snippet.style.whiteSpace = "nowrap";
    snippet.style.textOverflow = "ellipsis";
    snippet.style.padding = "4px 40px 4px 0";
    snippet.style.maxWidth = "100%";
    snippet.style.boxSizing = "border-box";

    const textSource = article.querySelector("[data-message-author-role]") || article;
    const rawText = (textSource.textContent || "").trim().replace(/\s+/g, " ");
    snippet.textContent = rawText.length > ARTICLE_SNIPPET_LENGTH
      ? rawText.slice(0, ARTICLE_SNIPPET_LENGTH) + "…"
      : rawText;

    article.appendChild(snippet);
  }

  function updateArticleSideRailLayout(article, sideRail) {
    if (!(article instanceof HTMLElement) || !(sideRail instanceof HTMLElement)) return;
    const rect = article.getBoundingClientRect();
    const hasLeftGutter = rect.left >= MESSAGE_RAIL_LEFT_GUTTER_THRESHOLD_PX;
    if (hasLeftGutter) {
      sideRail.style.left = `${MESSAGE_RAIL_OUTSIDE_LEFT_PX}px`;
      article.style.paddingLeft = article.dataset.gptBoostOrigPaddingLeft || "";
    } else {
      sideRail.style.left = `${MESSAGE_RAIL_INSIDE_LEFT_PX}px`;
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

  function scrollToVirtualId(virtualId) {
    const selectorId = escapeSelectorValue(virtualId);
    const target = document.querySelector(`[data-virtual-id="${selectorId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    scheduleVirtualization();
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
      currentConversationKey = getConversationStorageKey();
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

  // ---------------------------------------------------------------------------
  // Code Snippet Panel
  // ---------------------------------------------------------------------------

  function collectAllCodeSnippets() {
    const snippets = [];
    const sortedEntries = Array.from(state.articleMap.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    sortedEntries.forEach(([id, node]) => {
      const codeEls = node.querySelectorAll("pre code");
      const targets = codeEls.length > 0
        ? Array.from(codeEls)
        : Array.from(node.querySelectorAll("pre"));
      targets.forEach((el, i) => {
        const text = (el.textContent || "").trim();
        if (!text) return;
        const rawClass = el.className || "";
        const langMatch = rawClass.match(/\blanguage-(\S+)/);
        const lang = langMatch ? langMatch[1] : "";
        snippets.push({ text, messageId: id, index: i, lang });
      });
    });

    return snippets;
  }

  function hideCodePanel() {
    if (codePanelPanel) codePanelPanel.style.display = "none";
  }

  function hideCodePanelUi() {
    if (codePanelButton) codePanelButton.style.display = "none";
    hideCodePanel();
  }

  function populateCodePanel(panel) {
    const listContainer = panel.querySelector("[data-chatgpt-code-panel=\"list\"]");
    if (!listContainer) return;

    listContainer.innerHTML = "";
    const snippets = collectAllCodeSnippets();
    const theme = getThemeTokens();

    if (!snippets.length) {
      const empty = document.createElement("div");
      empty.style.fontSize = "12px";
      empty.style.opacity = "0.6";
      empty.style.padding = "4px 2px";
      empty.textContent = "No code blocks found in this conversation.";
      listContainer.appendChild(empty);
      return;
    }

    snippets.forEach(({ text, messageId, lang }, idx) => {
      const wrapper = document.createElement("div");
      wrapper.style.borderRadius = "8px";
      wrapper.style.border = `1px solid ${theme.panelBorder}`;
      wrapper.style.overflow = "hidden";
      wrapper.style.marginBottom = "8px";

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.justifyContent = "space-between";
      header.style.padding = "4px 8px";
      header.style.background = theme.buttonMutedBg;
      header.style.fontSize = "10px";
      header.style.color = theme.mutedText;

      const langLabel = document.createElement("span");
      langLabel.textContent = lang ? `#${idx + 1} · ${lang}` : `#${idx + 1}`;

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.textContent = "Copy";
      copyBtn.setAttribute("aria-label", "Copy code snippet");
      copyBtn.style.fontSize = "10px";
      copyBtn.style.padding = "1px 6px";
      copyBtn.style.borderRadius = "4px";
      copyBtn.style.border = "none";
      copyBtn.style.cursor = "pointer";
      copyBtn.style.background = theme.buttonBg;
      copyBtn.style.color = theme.buttonText;
      copyBtn.style.fontFamily = "inherit";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = "✓ Copied";
          setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
        }).catch(() => {
          copyBtn.textContent = "Error";
          setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
        });
      });

      header.appendChild(langLabel);
      header.appendChild(copyBtn);

      const pre = document.createElement("pre");
      pre.style.margin = "0";
      pre.style.padding = "8px";
      pre.style.fontSize = "12px";
      pre.style.overflowX = "auto";
      pre.style.maxHeight = "150px";
      pre.style.overflowY = "auto";
      pre.style.whiteSpace = "pre";
      pre.style.wordBreak = "normal";
      pre.style.lineHeight = "1.45";
      pre.style.background = theme.inputBg;
      pre.style.color = theme.text;
      pre.textContent = text;

      const jumpBtn = document.createElement("button");
      jumpBtn.type = "button";
      jumpBtn.textContent = "↗ Jump to message";
      jumpBtn.style.display = "block";
      jumpBtn.style.width = "100%";
      jumpBtn.style.fontSize = "10px";
      jumpBtn.style.padding = "3px 8px";
      jumpBtn.style.border = "none";
      jumpBtn.style.cursor = "pointer";
      jumpBtn.style.background = theme.buttonMutedBg;
      jumpBtn.style.color = theme.mutedText;
      jumpBtn.style.textAlign = "left";
      jumpBtn.style.fontFamily = "inherit";
      jumpBtn.addEventListener("click", () => {
        hideCodePanel();
        scrollToVirtualId(messageId);
      });

      wrapper.appendChild(header);
      wrapper.appendChild(pre);
      wrapper.appendChild(jumpBtn);
      listContainer.appendChild(wrapper);
    });
  }

  function showCodePanel() {
    const panel = ensureCodePanel();
    if (!panel) return;
    populateCodePanel(panel);
    panel.style.display = "flex";
  }

  function toggleCodePanel() {
    const panel = ensureCodePanel();
    if (!panel) return;
    if (panel.style.display !== "none") {
      hideCodePanel();
    } else {
      showCodePanel();
    }
  }

  function ensureCodePanelButton() {
    if (codePanelButton && codePanelButton.isConnected) return codePanelButton;
    if (!document.body) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-chatgpt-code-panel", "toggle");
    button.style.position = "fixed";
    button.style.right = `${CODE_PANEL_BUTTON_RIGHT_OFFSET_PX}px`;
    button.style.top = `${CODE_PANEL_BUTTON_TOP_OFFSET_PX}px`;
    button.style.zIndex = "9999";
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
    const poly1 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly1.setAttribute("points", "16 18 22 12 16 6");
    const poly2 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly2.setAttribute("points", "8 6 2 12 8 18");
    icon.appendChild(poly1);
    icon.appendChild(poly2);

    button.appendChild(icon);
    button.setAttribute("aria-label", "Open code snippets panel");
    styleSearchButton(button, CODE_PANEL_BUTTON_SIZE_PX);
    button.style.display = "none";
    button.addEventListener("click", toggleCodePanel);

    document.body.appendChild(button);
    codePanelButton = button;
    applyThemeToUi();
    return button;
  }

  function ensureCodePanel() {
    if (codePanelPanel && codePanelPanel.isConnected) return codePanelPanel;
    if (!document.body) return null;

    const panel = document.createElement("div");
    panel.setAttribute("data-chatgpt-code-panel", "panel");
    panel.style.position = "fixed";
    panel.style.top = `${CODE_PANEL_PANEL_TOP_OFFSET_PX}px`;
    panel.style.right = `${CODE_PANEL_PANEL_RIGHT_OFFSET_PX}px`;
    panel.style.zIndex = "9999";
    panel.style.width = `${CODE_PANEL_PANEL_WIDTH_PX}px`;
    panel.style.maxWidth = "min(90vw, 720px)";
    panel.style.maxHeight = `calc(100vh - ${CODE_PANEL_PANEL_TOP_OFFSET_PX + 16}px)`;
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
    panel.style.overflow = "hidden";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "8px";
    header.style.flexShrink = "0";

    const title = document.createElement("span");
    title.textContent = "Code Snippets";
    title.style.fontSize = "12px";
    title.style.fontWeight = "600";
    title.style.lineHeight = "1.2";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close code snippets panel");
    styleSearchButton(closeBtn, 22);
    closeBtn.style.display = "flex";
    closeBtn.style.background = "rgba(148, 163, 184, 0.2)";
    closeBtn.addEventListener("click", hideCodePanel);

    header.appendChild(title);
    header.appendChild(closeBtn);

    const listContainer = document.createElement("div");
    listContainer.setAttribute("data-chatgpt-code-panel", "list");
    listContainer.style.overflowY = "auto";
    listContainer.style.display = "flex";
    listContainer.style.flexDirection = "column";
    listContainer.style.gap = "0";
    listContainer.style.flex = "1";
    listContainer.style.minHeight = "0";

    panel.appendChild(header);
    panel.appendChild(listContainer);

    document.body.appendChild(panel);
    codePanelPanel = panel;
    applyThemeToUi();
    return panel;
  }

  function updateCodePanelVisibility(totalMessages) {
    const shouldShow = state.enabled && totalMessages > 0;
    const button = ensureCodePanelButton();
    if (!button) return;
    button.style.display = shouldShow ? "flex" : "none";
    if (!shouldShow) hideCodePanel();
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
      `> Exported: ${new Date().toLocaleString()}\n`,
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

      lines.push(`\n## ${displayRole}\n`);
      lines.push(contentParts.join("\n\n"));
      lines.push("\n---");
    });

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatgpt-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function toUnixNewlines(text) {
    return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function inferCodeLanguage(el) {
    const classCandidates = [];
    if (el instanceof HTMLElement && el.className) classCandidates.push(el.className);
    const nestedCode = el instanceof HTMLElement ? el.querySelector("code") : null;
    if (nestedCode instanceof HTMLElement && nestedCode.className) {
      classCandidates.push(nestedCode.className);
    }
    const classBlob = classCandidates.join(" ");
    const match = classBlob.match(/\blanguage-([a-z0-9_+-]+)/i);
    return match ? match[1].toLowerCase() : "";
  }

  function extractMarkdownPartsFromMessage(messageRoot) {
    function domToMarkdown(node) {
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
        const codeText = toUnixNewlines(source.innerText || source.textContent || "").trimEnd();
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
        
        const content = Array.from(node.childNodes).map(domToMarkdown).join("");
        // Only return if content is not empty (ignoring whitespace)
        if (!content.trim()) return "";
        return `\n\n${prefix}${content.trim()}\n\n`;
      }
      
      // Handle Lists
      if (tagName === "ul" || tagName === "ol") {
         const content = Array.from(node.childNodes).map(domToMarkdown).join("");
         return `\n${content}\n`;
      }
      if (tagName === "li") {
         const content = Array.from(node.childNodes).map(domToMarkdown).join("");
         const parentTag = node.parentElement ? node.parentElement.tagName.toLowerCase() : "ul";
         const prefix = parentTag === "ol" ? "1. " : "- "; 
         return `\n${prefix}${content.trim()}`;
      }

      // Handle formatting
      if (tagName === "strong" || tagName === "b") {
        return `**${Array.from(node.childNodes).map(domToMarkdown).join("")}**`;
      }
      if (tagName === "em" || tagName === "i") {
        return `*${Array.from(node.childNodes).map(domToMarkdown).join("")}*`;
      }
      if (tagName === "code") {
        return `\`${Array.from(node.childNodes).map(domToMarkdown).join("")}\``;
      }
      if (tagName === "a") {
          const href = node.getAttribute("href");
          const text = Array.from(node.childNodes).map(domToMarkdown).join("");
          return `[${text}](${href})`;
      }
      if (tagName === "br") return "\n";
      if (tagName === "hr") return "\n---\n";

      // Recurse for others
      return Array.from(node.childNodes).map(domToMarkdown).join("");
    }

    const markdown = domToMarkdown(messageRoot);
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
    button.style.zIndex = "9999";
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
    applyThemeToUi();
    return button;
  }

  function updateDownloadVisibility(totalMessages) {
    const shouldShow = state.enabled && totalMessages > 0;
    const button = ensureDownloadButton();
    if (!button) return;
    button.style.display = shouldShow ? "flex" : "none";
  }

  // ---------------------------------------------------------------------------
  // Bookmarks
  // ---------------------------------------------------------------------------

  function toggleBookmark(virtualId) {
    if (!currentConversationKey) {
      currentConversationKey = getConversationStorageKey();
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

    if (!state.bookmarkedMessages.size) {
      const empty = document.createElement("div");
      empty.style.fontSize = "12px";
      empty.style.opacity = "0.6";
      empty.style.padding = "4px 2px";
      empty.textContent = "No bookmarked messages.";
      listContainer.appendChild(empty);
      return;
    }

    const sortedIds = Array.from(state.bookmarkedMessages)
      .sort((a, b) => Number(a) - Number(b));

    sortedIds.forEach((id, index) => {
      const article = state.articleMap.get(id);
      if (!article) return;

      const textSource = article.querySelector("[data-message-author-role]") || article;
      const rawText = (textSource.textContent || "").trim().replace(/\s+/g, " ");
      const snippet = rawText.length > MINIMAP_PROMPT_SNIPPET_LENGTH
        ? rawText.slice(0, MINIMAP_PROMPT_SNIPPET_LENGTH) + "…"
        : rawText;

      const item = document.createElement("button");
      item.type = "button";
      item.style.display = "block";
      item.style.width = "100%";
      item.style.textAlign = "left";
      item.style.background = "transparent";
      item.style.border = "none";
      item.style.borderRadius = "8px";
      item.style.padding = "6px 8px";
      item.style.fontSize = "12px";
      item.style.lineHeight = "1.4";
      item.style.cursor = "pointer";
      item.style.color = theme.text;
      item.style.wordBreak = "break-word";
      item.style.fontFamily = "inherit";
      item.textContent = `${index + 1}. ${snippet}`;
      item.addEventListener("mouseenter", () => { item.style.background = theme.buttonMutedBg; });
      item.addEventListener("mouseleave", () => { item.style.background = "transparent"; });
      item.addEventListener("click", () => {
        hideBookmarksPanel();
        scrollToVirtualId(id);
      });

      listContainer.appendChild(item);
    });
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
    button.style.zIndex = "9999";
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
    panel.style.zIndex = "9999";
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
      `Virtualizing ${hidden} message${
        hidden === 1 ? "" : "s"
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
    const nodes = document.querySelectorAll(
      `${config.ARTICLE_SELECTOR}, div[data-chatgpt-virtual-spacer="1"]`
    );

    let total = 0;
    let rendered = 0;

    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (!node.dataset.virtualId) return;

      total += 1;
      if (node.tagName === "ARTICLE") rendered += 1;
    });

    state.stats.totalMessages = total;
    state.stats.renderedMessages = rendered;
    updateIndicator(total, rendered);
  }

  function virtualizeNow() {
    if (!state.enabled) {
      hideAllUiElements();
      return;
    }

    ensureVirtualIds();

    const nodes = document.querySelectorAll(
      `${config.ARTICLE_SELECTOR}, div[data-chatgpt-virtual-spacer="1"]`
    );
    if (!nodes.length) {
      log("virtualize: no messages yet");
      hideAllUiElements();
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

      if (node.tagName === "ARTICLE") {
        if (isOutside) convertArticleToSpacer(node);
      } else if (node.dataset.chatgptVirtualSpacer === "1") {
        if (!isOutside) convertSpacerToArticle(node);
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
  // Observers
  // ---------------------------------------------------------------------------

  function setupScrollTracking(scrollContainer, onScrollChange) {
    let lastCheckTime = 0;
    let frameId = null;

    const now =
      typeof performance !== "undefined" && performance.now
        ? () => performance.now()
        : () => Date.now();

    const runCheck = () => {
      const currentTime = now();
      if (currentTime - lastCheckTime < config.SCROLL_THROTTLE_MS) return;
      lastCheckTime = currentTime;
      onScrollChange();
    };

    const handleScroll = () => {
      if (frameId !== null) return;
      frameId = requestAnimationFrame(() => {
        frameId = null;
        runCheck();
      });
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    runCheck();

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }

  function createDebouncedObserver(onMutation, delayMs) {
    let timerId = null;

    return new MutationObserver(() => {
      if (timerId !== null) clearTimeout(timerId);
      timerId = setTimeout(() => {
        timerId = null;
        onMutation();
      }, delayMs);
    });
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
    state.cleanupScrollListener = setupScrollTracking(container, () => {
      scheduleVirtualization();
    });

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
    if (state.lifecycleStatus !== "IDLE") {
      log("bootVirtualizer called but already active");
      return;
    }

    if (!themeObserver) {
      themeObserver = new MutationObserver(() => applyThemeToUi());
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }

    const root = findConversationRoot();
    state.conversationRoot = root;

    const mutationObserver = createDebouncedObserver(() => {
      attachOrUpdateScrollListener();
      scheduleVirtualization();
    }, config.MUTATION_DEBOUNCE_MS);

    mutationObserver.observe(root, { childList: true, subtree: true });

    state.lifecycleStatus = "OBSERVING";
    state.observer = mutationObserver;

    log("Virtualizer booted.");
    currentConversationKey = getConversationStorageKey();

    // Ensure we start tracking even if messages already exist
    attachOrUpdateScrollListener();
    scheduleVirtualization();
    loadPersistedFlagsForConversation().catch(() => {});
  }

  function teardownVirtualizer() {
    if (state.observer) state.observer.disconnect();
    if (state.cleanupScrollListener) state.cleanupScrollListener();
    if (deferredVirtualizationTimer !== null) {
      clearTimeout(deferredVirtualizationTimer);
      deferredVirtualizationTimer = null;
    }
    if (saveFlagsTimer !== null) {
      clearTimeout(saveFlagsTimer);
      saveFlagsTimer = null;
    }
    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }

    state.scrollElement = null;
    state.observer = null;
    state.conversationRoot = null;
    state.lifecycleStatus = "IDLE";

    state.articleMap.clear();
    state.nextVirtualId = 1;
    state.emptyVirtualizationRetryCount = 0;

    document
      .querySelectorAll('div[data-chatgpt-virtual-spacer="1"]')
      .forEach((spacer) => spacer.remove());

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
    settingsEnabledInput = null;
    settingsDebugInput = null;
    settingsMarginInput = null;

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
      if (el instanceof HTMLElement) {
        el.style.boxShadow = "";
        const originalPaddingLeft = el.dataset.gptBoostOrigPaddingLeft || "";
        el.style.paddingLeft = originalPaddingLeft;
        delete el.dataset.gptBoostOrigPaddingLeft;
      }
    });
  }

  function startUrlWatcher() {
    setInterval(() => {
      if (window.location.href !== state.lastUrl) {
        state.lastUrl = window.location.href;
        log("URL changed → rebooting virtualizer");
        teardownVirtualizer();
        bootVirtualizer();
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
    getStatsSnapshot
  };
})();
