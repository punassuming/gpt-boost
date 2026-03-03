import { readStorageArea } from "../../../core/settings.js";
import {
  MESSAGE_FLAGS_STORAGE_KEY,
  KNOWN_CONVERSATIONS_STORAGE_KEY,
  summarizeConversationCaches
} from "../../../core/storage.js";
import { buildCachedConversationPayload } from "./settingsData.js";

export function refreshPopupCacheDetails(cacheDetailsElement) {
  if (!cacheDetailsElement) return Promise.resolve();
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = (tabs[0] && tabs[0].url) || "";
        const match = url.match(/\/c\/([^/?#]+)/);
        const currentConversationKey = match ? `chat:${match[1]}` : "";
        _renderCacheDetails(cacheDetailsElement, currentConversationKey).then(resolve).catch(resolve);
      });
    } else {
      _renderCacheDetails(cacheDetailsElement, "").then(resolve).catch(resolve);
    }
  });
}

function _renderCacheDetails(cacheDetailsElement, currentConversationKey) {
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

    // Render as formatted cards instead of raw JSON
    cacheDetailsElement.innerHTML = "";

    const summaryRow = document.createElement("div");
    summaryRow.className = "conv-summary";
    const totalConv = payload.totalCachedConversations;
    const totalPinned = payload.cachedPinnedMessages;
    const totalBookmarked = payload.cachedBookmarkedMessages;
    summaryRow.textContent =
      `${totalConv} conversation${totalConv !== 1 ? "s" : ""} cached` +
      (totalPinned || totalBookmarked
        ? ` · ${totalPinned} pinned · ${totalBookmarked} bookmarked`
        : "");
    cacheDetailsElement.appendChild(summaryRow);

    if (!payload.knownConversations.length) {
      const empty = document.createElement("div");
      empty.style.fontSize = "10px";
      empty.style.opacity = "0.6";
      empty.style.padding = "4px 2px";
      empty.textContent = "No conversations cached yet. Visit a ChatGPT chat to start.";
      cacheDetailsElement.appendChild(empty);
      return;
    }

    payload.knownConversations.forEach((conv) => {
      const flags = flagsStore[conv.key] || {};
      const knownEntry = knownStore[conv.key] || {};
      const isCurrent = conv.key === currentConversationKey;

      const card = document.createElement("div");
      card.className = "conv-card" + (isCurrent ? " conv-card-active" : "");

      const keyEl = document.createElement("div");
      keyEl.className = "conv-card-key";
      const shortKey = conv.key.replace(/^chat:/, "");
      keyEl.textContent = shortKey + (isCurrent ? " ← current" : "");
      card.appendChild(keyEl);

      const statParts = [`${conv.visits} visit${conv.visits !== 1 ? "s" : ""}`];
      if (Number(knownEntry.messageCount) > 0) statParts.push(`${knownEntry.messageCount} msgs`);
      if (Array.isArray(flags.pinned) && flags.pinned.length) statParts.push(`${flags.pinned.length} pinned`);
      if (Array.isArray(flags.bookmarked) && flags.bookmarked.length) statParts.push(`${flags.bookmarked.length} bookmarked`);
      if (conv.lastSeenAt) {
        const d = new Date(conv.lastSeenAt);
        if (!isNaN(d.getTime())) statParts.push(d.toLocaleDateString());
      }

      const statsEl = document.createElement("div");
      statsEl.className = "conv-card-stats";
      statsEl.textContent = statParts.join(" · ");
      card.appendChild(statsEl);

      if (knownEntry.note) {
        const noteEl = document.createElement("div");
        noteEl.className = "conv-card-note";
        noteEl.textContent = knownEntry.note;
        card.appendChild(noteEl);
      }

      cacheDetailsElement.appendChild(card);
    });
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
