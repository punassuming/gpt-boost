import {
  DEFAULT_EXTENSION_SETTINGS,
  CUSTOM_ROLE_THEME_KEY,
  DEFAULT_ROLE_THEME_KEY,
  ROLE_THEME_PRESETS,
  getRoleThemeColorPatch,
  normalizeRoleThemeKey,
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
  getSettingsStorageArea
} from "./core/settings.js";
import {
  KNOWN_CONVERSATIONS_STORAGE_KEY,
  extensionStorageGet,
  extensionStorageSet,
  saveConversationNote
} from "./core/storage.js";
import {
  buildCustomRoleColorPatch,
  buildRoleThemePresetPatch,
  getRoleThemeOptions
} from "./ui/features/settings/settingsData.js";
import { startPopupTelemetry } from "./ui/features/settings/popupTelemetry.js";

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
  const roleThemeKeyElement = document.getElementById("roleThemeKey");
  const userColorDarkElement = document.getElementById("userColorDark");
  const assistantColorDarkElement = document.getElementById("assistantColorDark");
  const userColorLightElement = document.getElementById("userColorLight");
  const assistantColorLightElement = document.getElementById("assistantColorLight");
  const resetColorsElement = document.getElementById("resetColors");
  const cacheDetailsElement = document.getElementById("cacheDetails");
  const conversationNoteElement = document.getElementById("conversationNote");
  const saveConversationNoteElement = document.getElementById("saveConversationNote");
  const exportBookmarksElement = document.getElementById("exportBookmarks");

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

  function ensureRoleThemeOptions() {
    if (!roleThemeKeyElement) return;
    roleThemeKeyElement.innerHTML = "";
    const options = getRoleThemeOptions(ROLE_THEME_PRESETS, CUSTOM_ROLE_THEME_KEY);
    options.forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      roleThemeKeyElement.appendChild(option);
    });
  }

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
    if (roleThemeKeyElement) {
      const nextThemeKey = normalizeRoleThemeKey(
        settingsState.roleThemeKey,
        DEFAULT_EXTENSION_SETTINGS.roleThemeKey
      );
      roleThemeKeyElement.value = nextThemeKey;
    }
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

  function applyRoleThemePreset(themeKey) {
    const patch = buildRoleThemePresetPatch({
      themeKey,
      roleThemePresets: ROLE_THEME_PRESETS,
      normalizeRoleThemeKey,
      defaultRoleThemeKey: DEFAULT_ROLE_THEME_KEY,
      customRoleThemeKey: CUSTOM_ROLE_THEME_KEY
    });
    if (!patch) return;
    settingsState = { ...settingsState, ...patch };
    applySettingsToInputs();
    persistSettingsPatch(patch);
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
  ensureRoleThemeOptions();
  applySettingsToInputs();

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

  if (roleThemeKeyElement) {
    roleThemeKeyElement.addEventListener("change", () => {
      const nextThemeKey = normalizeRoleThemeKey(roleThemeKeyElement.value, DEFAULT_ROLE_THEME_KEY);
      if (nextThemeKey === CUSTOM_ROLE_THEME_KEY) {
        settingsState.roleThemeKey = CUSTOM_ROLE_THEME_KEY;
        persistSettingsPatch({ roleThemeKey: CUSTOM_ROLE_THEME_KEY });
        applySettingsToInputs();
        return;
      }
      applyRoleThemePreset(nextThemeKey);
    });
  }

  userColorDarkElement.addEventListener("change", () => {
    const patch = buildCustomRoleColorPatch({
      colorKey: "userColorDark",
      colorValue: userColorDarkElement.value,
      normalizeColorHex,
      fallbackColor: DEFAULT_EXTENSION_SETTINGS.userColorDark,
      customRoleThemeKey: CUSTOM_ROLE_THEME_KEY
    });
    if (!patch) return;
    settingsState = { ...settingsState, ...patch };
    persistSettingsPatch(patch);
    applySettingsToInputs();
  });

  assistantColorDarkElement.addEventListener("change", () => {
    const patch = buildCustomRoleColorPatch({
      colorKey: "assistantColorDark",
      colorValue: assistantColorDarkElement.value,
      normalizeColorHex,
      fallbackColor: DEFAULT_EXTENSION_SETTINGS.assistantColorDark,
      customRoleThemeKey: CUSTOM_ROLE_THEME_KEY
    });
    if (!patch) return;
    settingsState = { ...settingsState, ...patch };
    persistSettingsPatch(patch);
    applySettingsToInputs();
  });

  userColorLightElement.addEventListener("change", () => {
    const patch = buildCustomRoleColorPatch({
      colorKey: "userColorLight",
      colorValue: userColorLightElement.value,
      normalizeColorHex,
      fallbackColor: DEFAULT_EXTENSION_SETTINGS.userColorLight,
      customRoleThemeKey: CUSTOM_ROLE_THEME_KEY
    });
    if (!patch) return;
    settingsState = { ...settingsState, ...patch };
    persistSettingsPatch(patch);
    applySettingsToInputs();
  });

  assistantColorLightElement.addEventListener("change", () => {
    const patch = buildCustomRoleColorPatch({
      colorKey: "assistantColorLight",
      colorValue: assistantColorLightElement.value,
      normalizeColorHex,
      fallbackColor: DEFAULT_EXTENSION_SETTINGS.assistantColorLight,
      customRoleThemeKey: CUSTOM_ROLE_THEME_KEY
    });
    if (!patch) return;
    settingsState = { ...settingsState, ...patch };
    persistSettingsPatch(patch);
    applySettingsToInputs();
  });

  if (resetColorsElement) {
    resetColorsElement.addEventListener("click", () => {
      const patch = buildRoleThemePresetPatch({
        themeKey: DEFAULT_ROLE_THEME_KEY,
        roleThemePresets: ROLE_THEME_PRESETS,
        normalizeRoleThemeKey,
        defaultRoleThemeKey: DEFAULT_ROLE_THEME_KEY,
        customRoleThemeKey: CUSTOM_ROLE_THEME_KEY
      }) || {
        roleThemeKey: DEFAULT_ROLE_THEME_KEY,
        ...getRoleThemeColorPatch(DEFAULT_ROLE_THEME_KEY, DEFAULT_ROLE_THEME_KEY)
      };
      settingsState = { ...settingsState, ...patch };
      applySettingsToInputs();
      persistSettingsPatch(patch);
    });
  }

  // ---- Conversation key helper -------------------------------------------

  function getActiveTabConversationKey(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = (tabs[0] && tabs[0].url) || "";
      const match = url.match(/\/c\/([^/?#]+)/);
      callback(match ? `chat:${match[1]}` : "");
    });
  }

  // ---- Conversation note --------------------------------------------------

  getActiveTabConversationKey((convKey) => {
    if (!convKey || !conversationNoteElement) return;
    extensionStorageGet(KNOWN_CONVERSATIONS_STORAGE_KEY).then((result) => {
      const knownStore = result[KNOWN_CONVERSATIONS_STORAGE_KEY] || {};
      const entry = knownStore[convKey];
      if (entry && entry.note) {
        conversationNoteElement.value = entry.note;
      }
    }).catch(() => {});
  });

  if (saveConversationNoteElement && conversationNoteElement) {
    saveConversationNoteElement.addEventListener("click", () => {
      getActiveTabConversationKey((convKey) => {
        if (!convKey) {
          saveConversationNoteElement.textContent = "No active chat";
          setTimeout(() => { saveConversationNoteElement.textContent = "Save"; }, 1500);
          return;
        }
        saveConversationNote(convKey, conversationNoteElement.value).then(() => {
          saveConversationNoteElement.textContent = "Saved ✓";
          setTimeout(() => { saveConversationNoteElement.textContent = "Save"; }, 1500);
        }).catch(() => {
          saveConversationNoteElement.textContent = "Error";
          setTimeout(() => { saveConversationNoteElement.textContent = "Save"; }, 1500);
        });
      });
    });
  }

  // ---- Export bookmarks --------------------------------------------------

  if (exportBookmarksElement) {
    exportBookmarksElement.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || tab.id == null) return;
        chrome.tabs.sendMessage(tab.id, { type: "getBookmarkedMessages" }, (response) => {
          if (chrome.runtime.lastError || !response || !response.bookmarks || !response.bookmarks.length) {
            exportBookmarksElement.textContent = "No bookmarks found";
            setTimeout(() => { exportBookmarksElement.textContent = "Export Bookmarks as Markdown"; }, 2000);
            return;
          }
          const lines = response.bookmarks.map((b, i) =>
            `## Bookmark ${i + 1} (${b.role})\n\n${b.text}`
          );
          const md = `# Bookmarked Messages\n\n${lines.join("\n\n---\n\n")}\n`;
          const blob = new Blob([md], { type: "text/markdown" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "bookmarks.md";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      });
    });
  }

  const stopPopupTelemetry = startPopupTelemetry({
    totalMessagesElement,
    renderedMessagesElement,
    memorySavedElement,
    cacheDetailsElement,
    getSettingsState: () => settingsState,
    setEnabled: (enabled) => {
      settingsState.enabled = !!enabled;
    },
    updateStatusText
  });
  window.addEventListener("beforeunload", stopPopupTelemetry);
});
