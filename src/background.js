// background.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set sane defaults
    chrome.storage.sync.set({
      enabled: true,
      debug: false
    });

    console.log("ChatGPT Virtual Scroller installed.");
  }

  if (details.reason === "update") {
    console.log(
      "ChatGPT Virtual Scroller updated to version",
      chrome.runtime.getManifest().version
    );
  }
});