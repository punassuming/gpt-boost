// boot.js
(function initializeContentScript() {
  const scroller = window.ChatGPTVirtualScroller;
  const state = scroller.state;
  const log = scroller.log;
  const virtualizer = scroller.virtualizer;
  const config = scroller.config;
  let promoInterval = null;

  function normalizeMargin(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return config.DEFAULT_MARGIN_PX;
    return Math.min(
      config.MAX_MARGIN_PX,
      Math.max(config.MIN_MARGIN_PX, Math.round(parsed))
    );
  }

  // ---- Storage: enabled + debug flags -----------------------------------

  function initializeStorageListeners() {
    chrome.storage.sync.get(
      { enabled: true, debug: false, marginPx: config.DEFAULT_MARGIN_PX },
      (data) => {
        state.enabled = data.enabled;
        state.debug = data.debug;
        config.MARGIN_PX = normalizeMargin(data.marginPx);

        startPromoLogging();
      }
    );

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync") return;
      let needsResize = false;
      if (changes.enabled) {
        state.enabled = changes.enabled.newValue;
        needsResize = true;
      }
      if (changes.marginPx) {
        config.MARGIN_PX = normalizeMargin(changes.marginPx.newValue);
        needsResize = true;
      }
      if (changes.debug) {
        state.debug = changes.debug.newValue;
        scroller.logPromoMessage();
      }
      if (needsResize) {
        virtualizer.handleResize();
      }
    });
  }

  // ---- Shameless self promotion -----------------------------------
  function startPromoLogging() {
    if (!state.debug) return;

    // Prevent multiple intervals
    if (promoInterval) return;

    // Log immediately once
    scroller.logPromoMessage();

    promoInterval = setInterval(() => {
      scroller.logPromoMessage();
    }, (5 * 60000)); // every 5 minutes
  }
  function stopPromoLogging() {
    if (promoInterval) {
      clearInterval(promoInterval);
      promoInterval = null;
    }
  }

  // ---- Popup stats API ---------------------------------------------------

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "getStats") return;

    const statsSnapshot = virtualizer.getStatsSnapshot();

    sendResponse({
      totalMessages: statsSnapshot.totalMessages,
      renderedMessages: statsSnapshot.renderedMessages,
      memorySavedPercent: statsSnapshot.memorySavedPercent,
      enabled: state.enabled,
    });
    return true;
  });

  // ---- Entry point -------------------------------------------------------

  function initialize() {
    log("Initializing ChatGPT Virtual Scroller");

    initializeStorageListeners();
    window.addEventListener("resize", virtualizer.handleResize);

    virtualizer.bootVirtualizer();
    virtualizer.startUrlWatcher();
  }

  // Auto-clean promo-logging when page unloads
  window.addEventListener("beforeunload", stopPromoLogging);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
