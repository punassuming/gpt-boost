(() => {
  // src/background.js
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      chrome.storage.sync.set({
        enabled: true,
        debug: false
      });
      console.log("GPT Boost installed.");
    }
    if (details.reason === "update") {
      console.log(
        "GPT Boost updated to version",
        chrome.runtime.getManifest().version
      );
    }
  });
})();
