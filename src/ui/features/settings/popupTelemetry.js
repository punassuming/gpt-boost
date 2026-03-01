import { readStorageArea } from "../../../core/settings.js";
import {
  MESSAGE_FLAGS_STORAGE_KEY,
  KNOWN_CONVERSATIONS_STORAGE_KEY,
  summarizeConversationCaches
} from "../../../core/storage.js";
import { buildCachedConversationPayload } from "./settingsData.js";

export function refreshPopupCacheDetails(cacheDetailsElement, currentConversationKey = "(popup)") {
  if (!cacheDetailsElement) return Promise.resolve();
  return readStorageArea(chrome.storage?.local).then((store) => {
    const flagsStore = store[MESSAGE_FLAGS_STORAGE_KEY] || {};
    const knownStore = store[KNOWN_CONVERSATIONS_STORAGE_KEY] || {};
    const summary = summarizeConversationCaches(flagsStore, knownStore);
    const payload = buildCachedConversationPayload({
      flagsStore,
      knownStore,
      summary,
      currentConversationKey
    });
    cacheDetailsElement.textContent = JSON.stringify(payload, null, 2);
  }).catch(() => {
    cacheDetailsElement.textContent = "Cached conversation stats unavailable.";
  });
}

export function updatePopupStatsUI({
  totalMessagesElement,
  renderedMessagesElement,
  memorySavedElement,
  settingsState,
  updateStatusText,
  setEnabled
}) {
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
      setEnabled(!!response.enabled);
      updateStatusText(!!response.enabled);
    });
  });
}

export function startPopupTelemetry({
  totalMessagesElement,
  renderedMessagesElement,
  memorySavedElement,
  cacheDetailsElement,
  getSettingsState,
  setEnabled,
  updateStatusText,
  intervalMs = 1000
}) {
  const tick = () => {
    updatePopupStatsUI({
      totalMessagesElement,
      renderedMessagesElement,
      memorySavedElement,
      settingsState: getSettingsState(),
      updateStatusText,
      setEnabled
    });
    refreshPopupCacheDetails(cacheDetailsElement);
  };

  tick();
  const intervalId = setInterval(tick, intervalMs);
  return () => clearInterval(intervalId);
}
