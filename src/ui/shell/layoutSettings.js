export function createLayoutSettingsManager({
  config,
  defaultRoleColors,
  getUiSettings
}) {
  let conversationLayoutStyleElement = null;

  function normalizeMargin(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return config.DEFAULT_MARGIN_PX;
    return Math.min(config.MAX_MARGIN_PX, Math.max(config.MIN_MARGIN_PX, Math.round(parsed)));
  }

  function ensureConversationLayoutStyleElement() {
    if (conversationLayoutStyleElement && conversationLayoutStyleElement.isConnected) {
      return conversationLayoutStyleElement;
    }
    const style = document.createElement("style");
    style.id = "gpt-boost-layout-settings";
    document.head.appendChild(style);
    conversationLayoutStyleElement = style;
    return style;
  }

  function applyRoleColorSettings() {
    const uiSettings = getUiSettings();
    const rootStyle = document.documentElement && document.documentElement.style;
    if (!rootStyle) return;
    rootStyle.setProperty("--gpt-boost-user-dark", uiSettings.userColorDark || defaultRoleColors.userDark);
    rootStyle.setProperty("--gpt-boost-assistant-dark", uiSettings.assistantColorDark || defaultRoleColors.assistantDark);
    rootStyle.setProperty("--gpt-boost-user-light", uiSettings.userColorLight || defaultRoleColors.userLight);
    rootStyle.setProperty("--gpt-boost-assistant-light", uiSettings.assistantColorLight || defaultRoleColors.assistantLight);
  }

  function applyConversationLayoutSettings() {
    const uiSettings = getUiSettings();
    const styleEl = ensureConversationLayoutStyleElement();
    styleEl.textContent = `
      .composer-parent {
        --composer-bar_current-width: ${uiSettings.composerWidthPx}px !important;
        --composer-bar_width: ${uiSettings.composerWidthPx}px !important;
      }
      [class*="thread-content-margin"] {
        --thread-content-margin: ${uiSettings.conversationPaddingPx}px !important;
      }
      [class*="thread-content-max-width"] {
        --thread-content-max-width: ${uiSettings.composerWidthPx}px !important;
      }
    `;

    const composerWidthValue = `${uiSettings.composerWidthPx}px`;
    const conversationPaddingValue = `${uiSettings.conversationPaddingPx}px`;
    document.querySelectorAll(".composer-parent").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.style.setProperty("--composer-bar_current-width", composerWidthValue, "important");
      node.style.setProperty("--composer-bar_width", composerWidthValue, "important");
    });
    document.querySelectorAll('[class*="thread-content-margin"]').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.style.setProperty("--thread-content-margin", conversationPaddingValue, "important");
    });
    document.querySelectorAll('[class*="thread-content-max-width"]').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.style.setProperty("--thread-content-max-width", composerWidthValue, "important");
    });
  }

  return {
    normalizeMargin,
    applyRoleColorSettings,
    applyConversationLayoutSettings
  };
}
