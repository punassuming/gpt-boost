import {
  DEFAULT_EXTENSION_SETTINGS,
  normalizeExtensionSettings,
  normalizeSidebarHotkey,
  normalizeColorHex,
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
  MUTATION_DEBOUNCE_MAX_MS,
  getSettingsStorageArea,
  readStorageArea
} from "./core/settings.js";
import {
  MESSAGE_FLAGS_STORAGE_KEY,
  KNOWN_CONVERSATIONS_STORAGE_KEY,
  summarizeConversationCaches
} from "./core/storage.js";

document.addEventListener("DOMContentLoaded", () => {
  const totalMessagesElement = document.getElementById("statTotalMessages");
  const renderedMessagesElement = document.getElementById("statRenderedMessages");
  const memorySavedElement = document.getElementById("statMemorySaved");
  const statusElement = document.getElementById("statStatus");

  const toggleEnabledElement = document.getElementById("toggleEnabled");
  const toggleDebugElement = document.getElementById("toggleDebug");
  const toggleMinimapElement = document.getElementById("toggleMinimapVisible");
  const bufferSizeElement = document.getElementById("bufferSize");
  const scrollThrottleElement = document.getElementById("scrollThrottle");
  const mutationDebounceElement = document.getElementById("mutationDebounce");
  const sidebarWidthElement = document.getElementById("sidebarWidth");
  const conversationPaddingElement = document.getElementById("conversationPadding");
  const composerWidthElement = document.getElementById("composerWidth");
  const sidebarHotkeyElement = document.getElementById("sidebarHotkey");
  const userColorDarkElement = document.getElementById("userColorDark");
  const assistantColorDarkElement = document.getElementById("assistantColorDark");
  const userColorLightElement = document.getElementById("userColorLight");
  const assistantColorLightElement = document.getElementById("assistantColorLight");
  const resetColorsElement = document.getElementById("resetColors");
  const cacheDetailsElement = document.getElementById("cacheDetails");

  const storageArea = getSettingsStorageArea();
  const FALLBACK_MIN_PX = 500;
  const FALLBACK_MAX_PX = 5000;
  const FALLBACK_DEFAULT_PX = 2000;
  let settingsState = normalizeExtensionSettings(
    {
      ...DEFAULT_EXTENSION_SETTINGS,
      marginPx: FALLBACK_DEFAULT_PX
    },
    {
      minMarginPx: FALLBACK_MIN_PX,
      maxMarginPx: FALLBACK_MAX_PX,
      defaultMarginPx: FALLBACK_DEFAULT_PX
    }
  );

  bufferSizeElement.min = String(FALLBACK_MIN_PX);
  bufferSizeElement.max = String(FALLBACK_MAX_PX);
  scrollThrottleElement.min = String(SCROLL_THROTTLE_MIN_MS);
  scrollThrottleElement.max = String(SCROLL_THROTTLE_MAX_MS);
  mutationDebounceElement.min = String(MUTATION_DEBOUNCE_MIN_MS);
  mutationDebounceElement.max = String(MUTATION_DEBOUNCE_MAX_MS);
  sidebarWidthElement.min = String(SIDEBAR_WIDTH_MIN_PX);
  sidebarWidthElement.max = String(SIDEBAR_WIDTH_MAX_PX);
  conversationPaddingElement.min = String(CONVERSATION_PADDING_MIN_PX);
  conversationPaddingElement.max = String(CONVERSATION_PADDING_MAX_PX);
  composerWidthElement.min = String(COMPOSER_WIDTH_MIN_PX);
  composerWidthElement.max = String(COMPOSER_WIDTH_MAX_PX);

  function updateStatusText(enabled) {
    statusElement.textContent = enabled ? "Active" : "Disabled";
    statusElement.classList.toggle("status-active", enabled);
    statusElement.classList.toggle("status-disabled", !enabled);
  }

  function applySettingsToInputs() {
    toggleEnabledElement.checked = !!settingsState.enabled;
    toggleDebugElement.checked = !!settingsState.debug;
    toggleMinimapElement.checked = !!settingsState.minimapVisible;
    bufferSizeElement.value = String(settingsState.marginPx);
    scrollThrottleElement.value = String(settingsState.scrollThrottleMs);
    mutationDebounceElement.value = String(settingsState.mutationDebounceMs);
    sidebarWidthElement.value = String(settingsState.sidebarWidthPx);
    conversationPaddingElement.value = String(settingsState.conversationPaddingPx);
    composerWidthElement.value = String(settingsState.composerWidthPx);
    sidebarHotkeyElement.value = settingsState.sidebarHotkey;
    userColorDarkElement.value = settingsState.userColorDark;
    assistantColorDarkElement.value = settingsState.assistantColorDark;
    userColorLightElement.value = settingsState.userColorLight;
    assistantColorLightElement.value = settingsState.assistantColorLight;
    updateStatusText(settingsState.enabled);
  }

  function persistSettingsPatch(patch) {
    if (!storageArea) return;
    storageArea.set(patch);
  }

  function normalizeNumberInput(input, min, max, fallback) {
    const parsed = Number(input.value);
    const next = Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, Math.round(parsed)))
      : fallback;
    input.value = String(next);
    return next;
  }

  function refreshCacheDetails() {
    if (!cacheDetailsElement) return;
    readStorageArea(chrome.storage?.local).then((store) => {
      const flagsStore = store[MESSAGE_FLAGS_STORAGE_KEY] || {};
      const knownStore = store[KNOWN_CONVERSATIONS_STORAGE_KEY] || {};
      const summary = summarizeConversationCaches(flagsStore, knownStore);
      const flaggedKeys = Object.keys(flagsStore || {});
      const knownKeys = Object.keys(knownStore || {});
      cacheDetailsElement.textContent = JSON.stringify(
        {
          totalCachedConversations: summary.totalKnownConversations,
          totalFlaggedConversations: summary.totalFlaggedConversations,
          cachedPinnedMessages: summary.cachedPinnedMessages,
          cachedBookmarkedMessages: summary.cachedBookmarkedMessages,
          approxFlagsBytes: summary.approxFlagsBytes,
          approxKnownBytes: summary.approxKnownBytes,
          flaggedConversations: flaggedKeys.slice(0, 10).map((key) => ({
            key,
            pinned: Array.isArray(flagsStore[key]?.pinned) ? flagsStore[key].pinned.length : 0,
            bookmarked: Array.isArray(flagsStore[key]?.bookmarked) ? flagsStore[key].bookmarked.length : 0
          })),
          knownConversations: knownKeys.slice(0, 10).map((key) => ({
            key,
            visits: Number(knownStore[key]?.visits || 0),
            lastSeenAt: knownStore[key]?.lastSeenAt || ""
          }))
        },
        null,
        2
      );
    }).catch(() => {
      cacheDetailsElement.textContent = "Cached conversation stats unavailable.";
    });
  }

  if (storageArea) {
    storageArea.get(
      {
        ...DEFAULT_EXTENSION_SETTINGS,
        marginPx: FALLBACK_DEFAULT_PX
      },
      (data) => {
        settingsState = normalizeExtensionSettings(data, {
          minMarginPx: FALLBACK_MIN_PX,
          maxMarginPx: FALLBACK_MAX_PX,
          defaultMarginPx: FALLBACK_DEFAULT_PX
        });
        applySettingsToInputs();
      }
    );
  } else {
    applySettingsToInputs();
  }

  toggleEnabledElement.addEventListener("change", () => {
    settingsState.enabled = toggleEnabledElement.checked;
    updateStatusText(settingsState.enabled);
    persistSettingsPatch({ enabled: settingsState.enabled });
  });

  toggleDebugElement.addEventListener("change", () => {
    settingsState.debug = toggleDebugElement.checked;
    persistSettingsPatch({ debug: settingsState.debug });
  });

  toggleMinimapElement.addEventListener("change", () => {
    settingsState.minimapVisible = toggleMinimapElement.checked;
    persistSettingsPatch({ minimapVisible: settingsState.minimapVisible });
  });

  bufferSizeElement.addEventListener("change", () => {
    const next = normalizeNumberInput(
      bufferSizeElement,
      FALLBACK_MIN_PX,
      FALLBACK_MAX_PX,
      FALLBACK_DEFAULT_PX
    );
    settingsState.marginPx = next;
    persistSettingsPatch({ marginPx: next });
  });

  scrollThrottleElement.addEventListener("change", () => {
    const next = normalizeScrollThrottleMs(
      scrollThrottleElement.value,
      DEFAULT_EXTENSION_SETTINGS.scrollThrottleMs
    );
    scrollThrottleElement.value = String(next);
    settingsState.scrollThrottleMs = next;
    persistSettingsPatch({ scrollThrottleMs: next });
  });

  mutationDebounceElement.addEventListener("change", () => {
    const next = normalizeMutationDebounceMs(
      mutationDebounceElement.value,
      DEFAULT_EXTENSION_SETTINGS.mutationDebounceMs
    );
    mutationDebounceElement.value = String(next);
    settingsState.mutationDebounceMs = next;
    persistSettingsPatch({ mutationDebounceMs: next });
  });

  sidebarWidthElement.addEventListener("change", () => {
    const next = normalizeNumberInput(
      sidebarWidthElement,
      SIDEBAR_WIDTH_MIN_PX,
      SIDEBAR_WIDTH_MAX_PX,
      DEFAULT_EXTENSION_SETTINGS.sidebarWidthPx
    );
    settingsState.sidebarWidthPx = next;
    persistSettingsPatch({ sidebarWidthPx: next });
  });

  conversationPaddingElement.addEventListener("change", () => {
    const next = normalizeConversationPaddingPx(
      conversationPaddingElement.value,
      DEFAULT_EXTENSION_SETTINGS.conversationPaddingPx
    );
    conversationPaddingElement.value = String(next);
    settingsState.conversationPaddingPx = next;
    persistSettingsPatch({ conversationPaddingPx: next });
  });

  composerWidthElement.addEventListener("change", () => {
    const next = normalizeComposerWidthPx(
      composerWidthElement.value,
      DEFAULT_EXTENSION_SETTINGS.composerWidthPx
    );
    composerWidthElement.value = String(next);
    settingsState.composerWidthPx = next;
    persistSettingsPatch({ composerWidthPx: next });
  });

  sidebarHotkeyElement.addEventListener("change", () => {
    const next = normalizeSidebarHotkey(
      sidebarHotkeyElement.value,
      DEFAULT_EXTENSION_SETTINGS.sidebarHotkey
    );
    sidebarHotkeyElement.value = next;
    settingsState.sidebarHotkey = next;
    persistSettingsPatch({ sidebarHotkey: next });
  });

  userColorDarkElement.addEventListener("change", () => {
    const next = normalizeColorHex(userColorDarkElement.value, DEFAULT_EXTENSION_SETTINGS.userColorDark);
    userColorDarkElement.value = next;
    settingsState.userColorDark = next;
    persistSettingsPatch({ userColorDark: next });
  });

  assistantColorDarkElement.addEventListener("change", () => {
    const next = normalizeColorHex(
      assistantColorDarkElement.value,
      DEFAULT_EXTENSION_SETTINGS.assistantColorDark
    );
    assistantColorDarkElement.value = next;
    settingsState.assistantColorDark = next;
    persistSettingsPatch({ assistantColorDark: next });
  });

  userColorLightElement.addEventListener("change", () => {
    const next = normalizeColorHex(userColorLightElement.value, DEFAULT_EXTENSION_SETTINGS.userColorLight);
    userColorLightElement.value = next;
    settingsState.userColorLight = next;
    persistSettingsPatch({ userColorLight: next });
  });

  assistantColorLightElement.addEventListener("change", () => {
    const next = normalizeColorHex(
      assistantColorLightElement.value,
      DEFAULT_EXTENSION_SETTINGS.assistantColorLight
    );
    assistantColorLightElement.value = next;
    settingsState.assistantColorLight = next;
    persistSettingsPatch({ assistantColorLight: next });
  });

  if (resetColorsElement) {
    resetColorsElement.addEventListener("click", () => {
      const patch = {
        userColorDark: DEFAULT_EXTENSION_SETTINGS.userColorDark,
        assistantColorDark: DEFAULT_EXTENSION_SETTINGS.assistantColorDark,
        userColorLight: DEFAULT_EXTENSION_SETTINGS.userColorLight,
        assistantColorLight: DEFAULT_EXTENSION_SETTINGS.assistantColorLight
      };
      settingsState = { ...settingsState, ...patch };
      applySettingsToInputs();
      persistSettingsPatch(patch);
    });
  }

  function updateStatsUI() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || activeTab.id == null) return;

      const url = activeTab.url || "";
      const isChatGPTTab =
        url.startsWith("https://chat.openai.com/") ||
        url.startsWith("https://chatgpt.com/");

      if (!isChatGPTTab) {
        totalMessagesElement.textContent = "N/A";
        renderedMessagesElement.textContent = "N/A";
        memorySavedElement.textContent = "N/A";
        updateStatusText(settingsState.enabled);
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { type: "getStats" }, (response) => {
        if (chrome.runtime.lastError || !response) return;
        totalMessagesElement.textContent = String(response.totalMessages);
        renderedMessagesElement.textContent = String(response.renderedMessages);
        memorySavedElement.textContent = `${response.memorySavedPercent}%`;
        settingsState.enabled = !!response.enabled;
        updateStatusText(settingsState.enabled);
      });
    });
  }

  refreshCacheDetails();
  updateStatsUI();
  const statsIntervalId = setInterval(() => {
    updateStatsUI();
    refreshCacheDetails();
  }, 1000);
  window.addEventListener("beforeunload", () => clearInterval(statsIntervalId));
});
