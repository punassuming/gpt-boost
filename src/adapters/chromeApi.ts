export function openSettingsPageViaRuntime(onResult?: (ok: boolean) => void): boolean {
  if (typeof chrome === "undefined" || !chrome.runtime || typeof chrome.runtime.sendMessage !== "function") {
    return false;
  }

  try {
    chrome.runtime.sendMessage({ type: "openSettingsPage" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.ok) {
        if (typeof onResult === "function") onResult(false);
        return;
      }
      if (typeof onResult === "function") onResult(true);
    });
    return true;
  } catch (_err) {
    return false;
  }
}

export function openExtensionPopupUrlFallback(): void {
  if (typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function") {
    const settingsUrl = chrome.runtime.getURL("src/popup.html");
    const opened = window.open(settingsUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = settingsUrl;
    }
    return;
  }
  window.open("about:blank", "_blank");
}
