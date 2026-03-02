export function createThemeApplier({
  refs,
  deps
}) {
  function applyThemeToUi() {
    const theme = deps.getThemeTokens();

    deps.applyScrollTheme(theme);

    const buttons = [
      refs.searchButton,
      refs.minimapButton,
      refs.codePanelButton,
      refs.downloadButton,
      refs.sidebarToggleButton
    ];
    buttons.forEach((button) => {
      if (!button) return;
      button.style.background = theme.buttonBg;
      button.style.color = theme.buttonText;
      button.style.boxShadow = theme.buttonShadow;
    });

    const minorButtons = [refs.searchPrevButton, refs.searchNextButton, refs.searchCloseButton];
    minorButtons.forEach((button) => {
      if (!button) return;
      button.style.background = theme.buttonMutedBg;
      button.style.color = theme.buttonMutedText;
      button.style.border = `1px solid ${theme.panelBorder}`;
    });

    if (refs.searchPanel) {
      refs.searchPanel.style.background = theme.panelBg;
      refs.searchPanel.style.boxShadow = theme.panelShadow;
      refs.searchPanel.style.border = `1px solid ${theme.panelBorder}`;
      refs.searchPanel.style.color = theme.text;
    }

    if (refs.searchInput) {
      refs.searchInput.style.background = theme.inputBg;
      refs.searchInput.style.border = `1px solid ${theme.inputBorder}`;
      refs.searchInput.style.color = theme.text;
      refs.searchInput.style.caretColor = theme.text;
    }

    if (refs.searchCountPrimaryLabel) {
      refs.searchCountPrimaryLabel.style.color = theme.text;
    }
    if (refs.searchCountSecondaryLabel) {
      refs.searchCountSecondaryLabel.style.color = theme.mutedText;
    }

    if (refs.minimapPanel) {
      deps.applyMinimapTheme(theme);
    }

    if (refs.codePanelPanel) {
      refs.codePanelPanel.style.background = theme.panelBg;
      refs.codePanelPanel.style.boxShadow = theme.panelShadow;
      refs.codePanelPanel.style.border = `1px solid ${theme.panelBorder}`;
      refs.codePanelPanel.style.color = theme.text;
    }

    if (refs.sidebarPanel) {
      refs.sidebarPanel.style.background = theme.panelBg;
      refs.sidebarPanel.style.boxShadow = theme.panelShadow;
      refs.sidebarPanel.style.border = `1px solid ${theme.panelBorder}`;
      refs.sidebarPanel.style.color = theme.text;
    }

    deps.applyPinnedTheme(theme);
    deps.dispatchThemeChanged();
  }

  return {
    applyThemeToUi
  };
}
