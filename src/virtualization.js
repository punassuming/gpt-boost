// virtualization.js
(function initializeVirtualizationModule() {
  const scroller = window.ChatGPTVirtualScroller;
  const config = scroller.config;
  const state = scroller.state;
  const log = scroller.log;
  let indicatorElement = null;
  let scrollToTopButton = null;
  let scrollToBottomButton = null;
  const SCROLL_BUTTON_SIZE_PX = 30;
  const SCROLL_BUTTON_OFFSET_PX = 12;
  // Keep the indicator close to the scrollbar without overlapping it.
  const INDICATOR_RIGHT_OFFSET_PX = 6;
  const INDICATOR_MIN_HEIGHT_PX = 28;
  const INDICATOR_MAX_HEIGHT_PX = 96;
  const INDICATOR_MIN_OPACITY = 0.4;
  const INDICATOR_MAX_OPACITY = 0.95;
  const MAX_SCROLL_ATTEMPTS = 2;
  const SCROLL_RETRY_DELAY_MS = 300;
  // 10px buffer prevents flicker from tiny overflow rounding differences.
  const SCROLL_BUFFER_PX = 10;

  // ---------------------------------------------------------------------------
  // Selectors
  // ---------------------------------------------------------------------------

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
      } else {
        const id = node.dataset.virtualId;
        if (id && !state.articleMap.has(id)) {
          state.articleMap.set(id, node);
        }
      }
    });
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
      return { top: rect.top, height: scrollElement.clientHeight };
    }

    return { top: 0, height: window.innerHeight };
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
    element.style.height = `${INDICATOR_MIN_HEIGHT_PX}px`;
    element.style.borderRadius = "999px";
    element.style.background = "rgba(17, 24, 39, 0.6)";
    element.style.boxShadow = "0 4px 10px rgba(15, 23, 42, 0.18)";
    element.style.opacity = String(INDICATOR_MIN_OPACITY);
    element.style.pointerEvents = "none";
    element.style.userSelect = "none";
    element.setAttribute("aria-label", "Virtualizing messages");
    document.body.appendChild(element);
    indicatorElement = element;
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
      button.style.top = `${SCROLL_BUTTON_OFFSET_PX}px`;
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

    return button;
  }

  function hideScrollButtons() {
    if (scrollToTopButton) scrollToTopButton.style.display = "none";
    if (scrollToBottomButton) scrollToBottomButton.style.display = "none";
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

  function updateIndicator(totalMessages, renderedMessages) {
    if (!state.enabled) {
      hideAllUiElements();
      return;
    }

    const hidden = totalMessages - renderedMessages;
    if (totalMessages === 0 || hidden <= 0) {
      hideIndicator();
      updateScrollButtons(totalMessages);
      return;
    }

    const element = ensureIndicatorElement();
    const clampedHiddenCount = Math.min(totalMessages, Math.max(0, hidden));
    const ratio = totalMessages > 0 ? clampedHiddenCount / totalMessages : 0;
    const height =
      INDICATOR_MIN_HEIGHT_PX +
      ratio * (INDICATOR_MAX_HEIGHT_PX - INDICATOR_MIN_HEIGHT_PX);
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
      return;
    }

    const viewport = getViewportMetrics();

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
    scheduleVirtualization();
  }

  function bootVirtualizer() {
    if (state.lifecycleStatus !== "IDLE") {
      log("bootVirtualizer called but already active");
      return;
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

    // Ensure we start tracking even if messages already exist
    attachOrUpdateScrollListener();
    scheduleVirtualization();
  }

  function teardownVirtualizer() {
    if (state.observer) state.observer.disconnect();
    if (state.cleanupScrollListener) state.cleanupScrollListener();

    state.scrollElement = null;
    state.observer = null;
    state.conversationRoot = null;
    state.lifecycleStatus = "IDLE";

    state.articleMap.clear();
    state.nextVirtualId = 1;

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
