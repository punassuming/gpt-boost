import './constants.js';
import './virtualization.js';
import { DEFAULT_EXTENSION_SETTINGS, normalizeExtensionSettings } from './core/settings.js';

// boot.js
(function initializeContentScript() {
  const scroller = window.ChatGPTVirtualScroller;
  const state = scroller.state;
  const log = scroller.log;
  const virtualizer = scroller.virtualizer;
  const config = scroller.config;
  let extensionSettings = {
    ...DEFAULT_EXTENSION_SETTINGS,
    marginPx: config.DEFAULT_MARGIN_PX
  };
  let promoInterval = null;

  function normalizeMargin(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return config.DEFAULT_MARGIN_PX;
    return Math.min(
      config.MAX_MARGIN_PX,
      Math.max(config.MIN_MARGIN_PX, Math.round(parsed))
    );
  }

  function applyVirtualizationConfig(settings) {
    config.MARGIN_PX = normalizeMargin(settings.marginPx);
    if (Number.isFinite(settings.scrollThrottleMs)) {
      config.SCROLL_THROTTLE_MS = Math.round(settings.scrollThrottleMs);
    }
    if (Number.isFinite(settings.mutationDebounceMs)) {
      config.MUTATION_DEBOUNCE_MS = Math.round(settings.mutationDebounceMs);
    }
  }

  // ---- Storage: enabled + debug flags -----------------------------------

  function initializeStorageListeners() {
    chrome.storage.sync.get(
      {
        ...DEFAULT_EXTENSION_SETTINGS,
        marginPx: config.DEFAULT_MARGIN_PX
      },
      (data) => {
        const normalized = normalizeExtensionSettings(data, {
          minMarginPx: config.MIN_MARGIN_PX,
          maxMarginPx: config.MAX_MARGIN_PX,
          defaultMarginPx: config.DEFAULT_MARGIN_PX
        });
        extensionSettings = normalized;

        state.enabled = normalized.enabled;
        state.debug = normalized.debug;
        applyVirtualizationConfig(normalized);
        if (virtualizer.applyUiSettings) {
          virtualizer.applyUiSettings(normalized);
        }

        startPromoLogging();
        if (virtualizer.teardownVirtualizer && virtualizer.bootVirtualizer) {
          virtualizer.teardownVirtualizer();
          virtualizer.bootVirtualizer();
        }
        virtualizer.handleResize();
      }
    );

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync") return;
      let nextSettings = { ...extensionSettings };
      let needsResize = false;
      if (changes.enabled) {
        nextSettings.enabled = changes.enabled.newValue;
        needsResize = true;
      }
      if (changes.marginPx) {
        nextSettings.marginPx = changes.marginPx.newValue;
        needsResize = true;
      }
      if (changes.debug) {
        nextSettings.debug = changes.debug.newValue;
      }
      if (changes.sidebarWidthPx) nextSettings.sidebarWidthPx = changes.sidebarWidthPx.newValue;
      if (changes.minimapVisible) nextSettings.minimapVisible = changes.minimapVisible.newValue;
      if (changes.sidebarHotkey) nextSettings.sidebarHotkey = changes.sidebarHotkey.newValue;
      if (changes.conversationPaddingPx) nextSettings.conversationPaddingPx = changes.conversationPaddingPx.newValue;
      if (changes.composerWidthPx) nextSettings.composerWidthPx = changes.composerWidthPx.newValue;
      if (changes.scrollThrottleMs) nextSettings.scrollThrottleMs = changes.scrollThrottleMs.newValue;
      if (changes.mutationDebounceMs) nextSettings.mutationDebounceMs = changes.mutationDebounceMs.newValue;
      if (changes.userColorDark) nextSettings.userColorDark = changes.userColorDark.newValue;
      if (changes.assistantColorDark) nextSettings.assistantColorDark = changes.assistantColorDark.newValue;
      if (changes.userColorLight) nextSettings.userColorLight = changes.userColorLight.newValue;
      if (changes.assistantColorLight) nextSettings.assistantColorLight = changes.assistantColorLight.newValue;

      const normalized = normalizeExtensionSettings(nextSettings, {
        minMarginPx: config.MIN_MARGIN_PX,
        maxMarginPx: config.MAX_MARGIN_PX,
        defaultMarginPx: config.DEFAULT_MARGIN_PX
      });
      extensionSettings = normalized;
      state.enabled = normalized.enabled;
      state.debug = normalized.debug;
      applyVirtualizationConfig(normalized);
      if (virtualizer.applyUiSettings) {
        virtualizer.applyUiSettings(normalized);
      }
      if (changes.debug) {
        scroller.logPromoMessage();
      }

      if (needsResize) {
        virtualizer.handleResize();
      }

      if ((changes.scrollThrottleMs || changes.mutationDebounceMs) &&
        virtualizer.teardownVirtualizer &&
        virtualizer.bootVirtualizer) {
        virtualizer.teardownVirtualizer();
        virtualizer.bootVirtualizer();
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
