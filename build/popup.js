(() => {
  // src/popup.js
  document.addEventListener("DOMContentLoaded", () => {
    const totalMessagesElement = document.getElementById("statTotalMessages");
    const renderedMessagesElement = document.getElementById("statRenderedMessages");
    const memorySavedElement = document.getElementById("statMemorySaved");
    const statusElement = document.getElementById("statStatus");
    const toggleEnabledElement = document.getElementById("toggleEnabled");
    const toggleDebugElement = document.getElementById("toggleDebug");
    const bufferSizeElement = document.getElementById("bufferSize");
    const config = window.ChatGPTVirtualScroller?.config;
    const storageArea = chrome.storage?.sync ?? chrome.storage?.local;
    const FALLBACK_MIN_PX = 500;
    const FALLBACK_MAX_PX = 5e3;
    const FALLBACK_DEFAULT_PX = 2e3;
    const MIN_BUFFER_PX = config?.MIN_MARGIN_PX ?? FALLBACK_MIN_PX;
    const MAX_BUFFER_PX = config?.MAX_MARGIN_PX ?? FALLBACK_MAX_PX;
    const DEFAULT_BUFFER_PX = config?.DEFAULT_MARGIN_PX ?? FALLBACK_DEFAULT_PX;
    const settingsState = {
      enabled: true,
      debug: false,
      marginPx: DEFAULT_BUFFER_PX
    };
    bufferSizeElement.min = String(MIN_BUFFER_PX);
    bufferSizeElement.max = String(MAX_BUFFER_PX);
    function normalizeBufferSize(value) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return DEFAULT_BUFFER_PX;
      return Math.min(MAX_BUFFER_PX, Math.max(MIN_BUFFER_PX, Math.round(parsed)));
    }
    function updateStatusText(enabled) {
      statusElement.textContent = enabled ? "Active" : "Disabled";
      statusElement.classList.toggle("status-active", enabled);
      statusElement.classList.toggle("status-disabled", !enabled);
    }
    storageArea.get(
      { enabled: true, debug: false, marginPx: DEFAULT_BUFFER_PX },
      (data) => {
        settingsState.enabled = data.enabled;
        settingsState.debug = data.debug;
        settingsState.marginPx = data.marginPx;
        toggleEnabledElement.checked = settingsState.enabled;
        toggleDebugElement.checked = settingsState.debug;
        bufferSizeElement.value = String(normalizeBufferSize(settingsState.marginPx));
        updateStatusText(settingsState.enabled);
      }
    );
    toggleEnabledElement.addEventListener("change", () => {
      const newValue = toggleEnabledElement.checked;
      settingsState.enabled = newValue;
      updateStatusText(newValue);
      storageArea.set({ enabled: newValue });
    });
    toggleDebugElement.addEventListener("change", () => {
      const newValue = toggleDebugElement.checked;
      settingsState.debug = newValue;
      storageArea.set({ debug: newValue });
    });
    bufferSizeElement.addEventListener("change", () => {
      const normalized = normalizeBufferSize(bufferSizeElement.value);
      bufferSizeElement.value = String(normalized);
      settingsState.marginPx = normalized;
      storageArea.set({ marginPx: normalized });
    });
    function updateStatsUI() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || activeTab.id == null) return;
        const url = activeTab.url || "";
        const isChatGPTTab = url.startsWith("https://chat.openai.com/") || url.startsWith("https://chatgpt.com/");
        if (!isChatGPTTab) {
          totalMessagesElement.textContent = "N/A";
          renderedMessagesElement.textContent = "N/A";
          memorySavedElement.textContent = "N/A";
          updateStatusText(settingsState.enabled);
          return;
        }
        chrome.tabs.sendMessage(
          activeTab.id,
          { type: "getStats" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.debug(
                "[GPT Boost] No stats available:",
                chrome.runtime.lastError.message
              );
              return;
            }
            if (!response) return;
            const {
              totalMessages,
              renderedMessages,
              memorySavedPercent,
              enabled
            } = response;
            totalMessagesElement.textContent = String(totalMessages);
            renderedMessagesElement.textContent = String(renderedMessages);
            memorySavedElement.textContent = `${memorySavedPercent}%`;
            settingsState.enabled = enabled;
            updateStatusText(enabled);
          }
        );
      });
    }
    updateStatsUI();
    const statsIntervalId = setInterval(updateStatsUI, 1e3);
    window.addEventListener("beforeunload", () => clearInterval(statsIntervalId));
  });
})();
