import './constants.js';
import './virtualization.js';

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
        virtualizer.handleResize();
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
    log("Initializing GPT Boost");

    initializeStorageListeners();
    window.addEventListener("resize", virtualizer.handleResize);

    virtualizer.bootVirtualizer();
    virtualizer.startUrlWatcher();

    // Some ChatGPT layouts stabilize after initial idle; keep UI in sync early.
    // Run up to 60 times (30s at 500ms) but stop as soon as messages are found.
    // forceVirtualize() directly calls virtualizeNow without rAF, guarding against
    // rAF throttling in Firefox content script contexts.
    let warmupRuns = 0;
    const warmupTimer = setInterval(() => {
      warmupRuns += 1;
      virtualizer.handleResize();         // rAF-gated, attaches scroll listener
      virtualizer.forceVirtualize();      // direct, no rAF — ensures UI shows up
      const found = scroller.state.stats.totalMessages > 0;
      if (found || warmupRuns >= 60) {
        clearInterval(warmupTimer);
      }
    }, 500);
  }

  // Auto-clean promo-logging when page unloads
  window.addEventListener("beforeunload", stopPromoLogging);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
