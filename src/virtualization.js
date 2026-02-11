// virtualization.js
(function initializeVirtualizationModule() {
  const scroller = window.ChatGPTVirtualScroller;
  const config = scroller.config;
  const state = scroller.state;
  const log = scroller.log;
  let indicatorElement = null;
  let scrollTopButton = null;
  let scrollBottomButton = null;
  // Small buffer to ignore tiny overflow differences when checking scrollability.
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
    return Math.max(0, scrollTarget.scrollHeight - scrollTarget.clientHeight);
  }

  function ensureIndicatorElement() {
    if (indicatorElement && indicatorElement.isConnected) {
      return indicatorElement;
    }

    const element = document.createElement("div");
    element.setAttribute("data-chatgpt-virtual-indicator", "1");
    element.style.position = "fixed";
    element.style.right = "12px";
    element.style.bottom = "52px";
    element.style.zIndex = "9999";
    element.style.display = "none";
    element.style.padding = "4px 10px";
    element.style.borderRadius = "999px";
    element.style.background = "rgba(17, 24, 39, 0.75)";
    element.style.color = "#f9fafb";
    element.style.fontSize = "11px";
    element.style.fontWeight = "600";
    element.style.fontFamily =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    element.style.letterSpacing = "0.02em";
    element.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";
    element.style.pointerEvents = "none";
    element.style.userSelect = "none";
    element.style.whiteSpace = "nowrap";
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

  function ensureScrollButton(position) {
    const existingButton = position === "top" ? scrollTopButton : scrollBottomButton;
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
    button.style.right = "12px";
    button.style.zIndex = "9999";
    button.style.width = "30px";
    button.style.height = "30px";
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
      button.style.top = "12px";
      button.textContent = "↑";
      button.setAttribute("aria-label", "Scroll to top");
    } else {
      button.style.bottom = "12px";
      button.textContent = "↓";
      button.setAttribute("aria-label", "Scroll to bottom");
    }

    button.addEventListener("click", () => {
      const scrollTarget = getScrollTarget();

      if (!scrollTarget) return;

      if (position === "top") {
        scrollTarget.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const maxScrollTop = getMaxScrollTop(scrollTarget);
        scrollTarget.scrollTo({
          top: maxScrollTop,
          behavior: "smooth"
        });
      }
    });

    document.body.appendChild(button);

    if (position === "top") {
      scrollTopButton = button;
    } else {
      scrollBottomButton = button;
    }

    return button;
  }

  function hideScrollButtons() {
    if (scrollTopButton) scrollTopButton.style.display = "none";
    if (scrollBottomButton) scrollBottomButton.style.display = "none";
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

    const isScrollable =
      scrollTarget.scrollHeight - scrollTarget.clientHeight >= SCROLL_BUFFER_PX;
    if (!isScrollable) {
      hideScrollButtons();
      return;
    }

    const topButton = ensureScrollButton("top");
    const bottomButton = ensureScrollButton("bottom");
    if (!topButton || !bottomButton) {
      hideScrollButtons();
      return;
    }

    const maxScrollTop = getMaxScrollTop(scrollTarget);
    topButton.style.display =
      scrollTarget.scrollTop > SCROLL_BUFFER_PX ? "flex" : "none";
    bottomButton.style.display =
      scrollTarget.scrollTop < maxScrollTop - SCROLL_BUFFER_PX ? "flex" : "none";
  }

  function updateIndicator(totalMessages, renderedMessages) {
    if (!state.enabled) {
      hideIndicator();
      hideScrollButtons();
      return;
    }

    const hidden = totalMessages - renderedMessages;
    if (totalMessages === 0 || hidden <= 0) {
      hideIndicator();
      updateScrollButtons(totalMessages);
      return;
    }

    const element = ensureIndicatorElement();
    element.textContent = `Virtualizing ${hidden} message${
      hidden === 1 ? "" : "s"
    }`;
    element.setAttribute(
      "aria-label",
      `Virtualizing ${hidden} message${hidden === 1 ? "" : "s"}`
    );
    element.style.display = "inline-flex";
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
      hideIndicator();
      hideScrollButtons();
      return;
    }

    ensureVirtualIds();

    const nodes = document.querySelectorAll(
      `${config.ARTICLE_SELECTOR}, div[data-chatgpt-virtual-spacer="1"]`
    );
    if (!nodes.length) {
      log("virtualize: no messages yet");
      hideIndicator();
      hideScrollButtons();
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

    if (scrollTopButton && scrollTopButton.isConnected) {
      scrollTopButton.remove();
    }
    if (scrollBottomButton && scrollBottomButton.isConnected) {
      scrollBottomButton.remove();
    }
    scrollTopButton = null;
    scrollBottomButton = null;
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
