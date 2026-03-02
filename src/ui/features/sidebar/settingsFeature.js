import { renderSidebarSettingsTab } from './settingsTab.js';

export function createSidebarSettingsFeature({
  deps
}) {
  function render(container) {
    renderSidebarSettingsTab({
      container,
      storage: deps.getSettingsStorageArea(),
      theme: deps.getThemeTokens(),
      state: deps.state,
      config: deps.config,
      uiSettings: deps.getUiSettings(),
      defaults: deps.defaults,
      constants: deps.constants,
      helpers: deps.helpers,
      callbacks: deps.callbacks
    });
  }

  return {
    render
  };
}
