export function createSearchFloatingUi({
  refs,
  constants,
  deps,
  callbacks
}) {
  function ensureSearchButton() {
    if (refs.searchButton && refs.searchButton.isConnected) {
      return refs.searchButton;
    }

    if (!document.body) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-chatgpt-virtual-search", "toggle");
    button.style.position = "fixed";
    button.style.right = `${constants.searchButtonRightOffsetPx}px`;
    button.style.top = `${constants.searchButtonTopOffsetPx}px`;
    button.style.zIndex = "10002";
    button.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.style.width = "14px";
    icon.style.height = "14px";
    icon.style.fill = "currentColor";
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M15.5 14h-.79l-.28-.27a6 6 0 1 0-.71.71l.27.28v.79l4.25 4.25 1.5-1.5L15.5 14Zm-5.5 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
    );
    icon.appendChild(path);
    button.appendChild(icon);
    button.setAttribute("aria-label", "Search chat messages");
    deps.styleSearchButton(button, constants.searchButtonSizePx);
    button.style.display = "none";
    button.addEventListener("click", callbacks.toggleSearchPanel);

    document.body.appendChild(button);
    refs.searchButton = button;
    deps.applyFloatingUiOffsets();
    deps.applyThemeToUi();
    return button;
  }

  function ensureSearchPanel() {
    if (refs.searchPanel && refs.searchPanel.isConnected) {
      return refs.searchPanel;
    }

    if (!document.body) return null;

    const panel = document.createElement("div");
    panel.setAttribute("data-chatgpt-virtual-search", "panel");
    panel.style.position = "fixed";
    panel.style.top = `${constants.searchPanelTopOffsetPx}px`;
    panel.style.right = `${constants.searchPanelRightOffsetPx}px`;
    panel.style.zIndex = "10001";
    panel.style.width = `${constants.searchPanelWidthPx}px`;
    panel.style.display = "none";
    panel.style.flexDirection = "column";
    panel.style.alignItems = "stretch";
    panel.style.gap = "8px";
    panel.style.padding = "10px";
    panel.style.borderRadius = "14px";
    panel.style.background = "rgba(15, 23, 42, 0.92)";
    panel.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.28)";
    panel.style.color = "#f9fafb";
    panel.style.backdropFilter = "blur(6px)";

    const inputRow = document.createElement("div");
    inputRow.style.display = "flex";
    inputRow.style.alignItems = "center";
    inputRow.style.gap = "6px";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search chat...";
    input.setAttribute("aria-label", "Search chat");
    input.style.flex = "1";
    input.style.minWidth = "0";
    input.style.height = "28px";
    input.style.border = "1px solid rgba(148, 163, 184, 0.35)";
    input.style.outline = "none";
    input.style.background = "rgba(15, 23, 42, 0.6)";
    input.style.color = "#f9fafb";
    input.style.fontSize = "12px";
    input.style.fontFamily = "inherit";
    input.style.borderRadius = "8px";
    input.style.padding = "0 8px";
    input.style.boxSizing = "border-box";
    input.addEventListener("input", (event) => {
      callbacks.scheduleSearch(event.target.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        callbacks.navigateSearch(event.shiftKey ? -1 : 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        callbacks.hideSearchPanel();
      }
    });

    const count = document.createElement("div");
    count.style.display = "flex";
    count.style.flexDirection = "column";
    count.style.alignItems = "flex-start";
    count.style.justifyContent = "center";
    count.style.gap = "2px";
    count.style.opacity = "0.85";
    count.style.minWidth = "80px";
    count.style.textAlign = "left";

    const countPrimary = document.createElement("span");
    countPrimary.textContent = "0/0";
    countPrimary.style.fontSize = "11px";
    countPrimary.style.fontWeight = "600";
    countPrimary.style.lineHeight = "1.1";
    countPrimary.style.display = "block";

    const countSecondary = document.createElement("span");
    countSecondary.textContent = "0 matches";
    countSecondary.style.fontSize = "10px";
    countSecondary.style.lineHeight = "1.1";
    countSecondary.style.display = "block";
    countSecondary.style.opacity = "0.9";

    count.appendChild(countPrimary);
    count.appendChild(countSecondary);

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.textContent = "↑";
    prevButton.setAttribute("aria-label", "Previous match");
    deps.styleSearchButton(prevButton, 22);
    prevButton.style.display = "flex";
    prevButton.style.background = "rgba(148, 163, 184, 0.2)";
    prevButton.addEventListener("click", () => callbacks.navigateSearch(-1));

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.textContent = "↓";
    nextButton.setAttribute("aria-label", "Next match");
    deps.styleSearchButton(nextButton, 22);
    nextButton.style.display = "flex";
    nextButton.style.background = "rgba(148, 163, 184, 0.2)";
    nextButton.addEventListener("click", () => callbacks.navigateSearch(1));

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close search");
    deps.styleSearchButton(closeButton, 22);
    closeButton.style.display = "flex";
    closeButton.style.background = "rgba(148, 163, 184, 0.2)";
    closeButton.addEventListener("click", callbacks.hideSearchPanel);

    const sidebarButton = document.createElement("button");
    sidebarButton.type = "button";
    sidebarButton.textContent = "⇱";
    sidebarButton.setAttribute("aria-label", "Open search in sidebar");
    deps.styleSearchButton(sidebarButton, 22);
    sidebarButton.style.display = "flex";
    sidebarButton.style.background = "rgba(148, 163, 184, 0.2)";
    sidebarButton.addEventListener("click", () => {
      callbacks.hideSearchPanel();
      deps.openSidebar("search");
    });

    const controlsRow = document.createElement("div");
    controlsRow.style.display = "flex";
    controlsRow.style.alignItems = "center";
    controlsRow.style.justifyContent = "space-between";
    controlsRow.style.gap = "8px";

    const navGroup = document.createElement("div");
    navGroup.style.display = "flex";
    navGroup.style.alignItems = "center";
    navGroup.style.gap = "6px";
    navGroup.appendChild(prevButton);
    navGroup.appendChild(nextButton);

    inputRow.appendChild(input);
    inputRow.appendChild(sidebarButton);
    inputRow.appendChild(closeButton);

    controlsRow.appendChild(count);
    controlsRow.appendChild(navGroup);

    panel.appendChild(inputRow);
    panel.appendChild(controlsRow);

    document.body.appendChild(panel);

    refs.searchPanel = panel;
    refs.searchInput = input;
    refs.searchPrevButton = prevButton;
    refs.searchNextButton = nextButton;
    refs.searchCountLabel = count;
    refs.searchCountPrimaryLabel = countPrimary;
    refs.searchCountSecondaryLabel = countSecondary;
    refs.searchCloseButton = closeButton;
    deps.applyFloatingUiOffsets();
    deps.applyThemeToUi();
    return panel;
  }

  return {
    ensureSearchButton,
    ensureSearchPanel
  };
}
