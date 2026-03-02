// background.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set sane defaults
    chrome.storage.sync.set({
      enabled: true,
      debug: false
    });

  }

});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "openSettingsPage") return;

  const settingsUrl = chrome.runtime.getURL("src/popup.html");

  const openSettings = async () => {
    try {
      if (typeof chrome.runtime.openOptionsPage === "function") {
        await chrome.runtime.openOptionsPage();
      } else if (chrome.tabs && typeof chrome.tabs.create === "function") {
        await chrome.tabs.create({ url: settingsUrl });
      } else {
        throw new Error("No settings open API available");
      }
      sendResponse({ ok: true });
    } catch (_err) {
      try {
        if (chrome.tabs && typeof chrome.tabs.create === "function") {
          await chrome.tabs.create({ url: settingsUrl });
          sendResponse({ ok: true });
          return;
        }
      } catch (_fallbackErr) {
        // Fall through to negative response.
      }
      sendResponse({ ok: false });
    }
  };

  openSettings();
  return true;
});
