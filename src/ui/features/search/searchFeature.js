import {
  clearSearchTextHighlights as clearHighlightsInElement,
  highlightMatchesInElement as highlightMatches
} from './searchHighlighting.js';
import {
  collectSearchTargets as collectTargets,
  summarizeSearchResult,
  findSearchMatches
} from './searchIndex.js';

export function createSearchFeature({
  refs,
  searchState,
  state,
  constants,
  deps
}) {
  function clearSearchTextHighlights(element) {
    clearHighlightsInElement(element);
  }

  function clearSearchHighlight() {
    if (refs.highlightedSearchElement) {
      clearSearchTextHighlights(refs.highlightedSearchElement);
      refs.highlightedSearchElement.style.outline = "";
      refs.highlightedSearchElement.style.outlineOffset = "";
      refs.highlightedSearchElement.style.borderRadius = "";
      refs.highlightedSearchElement = null;
    }
  }

  function highlightMatchesInElement(element, query) {
    highlightMatches(element, query);
  }

  function setSearchHighlight(element) {
    if (!(element instanceof HTMLElement)) return;
    clearSearchHighlight();
    element.style.outline = "2px solid #fbbf24";
    element.style.outlineOffset = "2px";
    element.style.borderRadius = "8px";
    highlightMatchesInElement(element, searchState.query);
    refs.highlightedSearchElement = element;
  }

  function updateSearchCountLabel() {
    if (!refs.searchCountLabel) return;
    const totalSections = searchState.results.length;
    const active =
      totalSections && searchState.activeIndex >= 0
        ? searchState.activeIndex + 1
        : 0;
    const primaryText = `${active}/${totalSections}`;
    const secondaryText = `${searchState.matchCount} match${searchState.matchCount === 1 ? "" : "es"
      }`;

    if (refs.searchCountPrimaryLabel && refs.searchCountSecondaryLabel) {
      refs.searchCountPrimaryLabel.textContent = primaryText;
      refs.searchCountSecondaryLabel.textContent = secondaryText;
      return;
    }

    refs.searchCountLabel.textContent = `${primaryText} • ${searchState.matchCount}`;
  }

  function collectSearchTargets() {
    return collectTargets({
      ensureVirtualIds: deps.ensureVirtualIds,
      getActiveConversationNodes: deps.getActiveConversationNodes,
      articleMap: state.articleMap
    });
  }

  function getSearchResultSummary(id, index, total) {
    return summarizeSearchResult({
      id,
      index,
      total,
      articleMap: state.articleMap,
      getMessageRole: deps.getMessageRole,
      articleSnippetLength: constants.articleSnippetLength
    });
  }

  function focusSearchResult(id) {
    deps.scrollToVirtualId(id);

    const selectorId = deps.escapeSelectorValue(id);
    setTimeout(() => {
      const refreshed =
        document.querySelector(`article[data-virtual-id="${selectorId}"]`) ||
        document.querySelector(`[data-virtual-id="${selectorId}"]`);
      if (refreshed instanceof HTMLElement) {
        setSearchHighlight(refreshed);
      }
    }, 200);
  }

  function rerenderSearchSidebarPreservingInputFocus() {
    if (!deps.isSidebarOpen() || deps.getActiveSidebarTab() !== "search" || !deps.getSidebarContentContainer()) return;

    const activeEl = document.activeElement;
    const sidebarContentContainer = deps.getSidebarContentContainer();
    const isSidebarSearchInput =
      activeEl instanceof HTMLInputElement &&
      activeEl.getAttribute("aria-label") === "Search chat" &&
      sidebarContentContainer &&
      sidebarContentContainer.contains(activeEl);

    const selectionStart = isSidebarSearchInput ? activeEl.selectionStart : null;
    const selectionEnd = isSidebarSearchInput ? activeEl.selectionEnd : null;

    deps.renderSidebarTab("search");

    if (!isSidebarSearchInput) return;

    const restoreFocus = () => {
      const nextContainer = deps.getSidebarContentContainer();
      if (!nextContainer) return;
      const nextInput = nextContainer.querySelector('input[aria-label="Search chat"]');
      if (!(nextInput instanceof HTMLInputElement)) return;
      nextInput.focus();
      const max = nextInput.value.length;
      const nextStart =
        typeof selectionStart === "number"
          ? Math.max(0, Math.min(max, selectionStart))
          : max;
      const nextEnd =
        typeof selectionEnd === "number"
          ? Math.max(nextStart, Math.min(max, selectionEnd))
          : nextStart;
      try {
        nextInput.setSelectionRange(nextStart, nextEnd);
      } catch (_err) {
        // Ignore selection failures on unsupported input types/contexts.
      }
    };

    setTimeout(restoreFocus, 0);
    requestAnimationFrame(restoreFocus);
  }

  function runSearch(query) {
    searchState.query = query;
    const entries = collectSearchTargets();
    const { normalized, results, matchCount } = findSearchMatches(entries, query);

    if (!normalized) {
      searchState.results = [];
      searchState.activeIndex = -1;
      searchState.indexedTotal = state.stats.totalMessages;
      searchState.matchCount = 0;
      updateSearchCountLabel();
      clearSearchHighlight();
      rerenderSearchSidebarPreservingInputFocus();
      return;
    }

    searchState.results = results;
    searchState.activeIndex = results.length ? 0 : -1;
    searchState.indexedTotal = state.stats.totalMessages;
    searchState.matchCount = matchCount;

    updateSearchCountLabel();
    if (!results.length) {
      clearSearchHighlight();
    }
    rerenderSearchSidebarPreservingInputFocus();
    if (deps.isSidebarOpen() && deps.getActiveSidebarTab() !== "search") {
      deps.refreshSidebarTab();
    }
  }

  function scheduleSearch(query) {
    if (refs.searchDebounceTimer !== null) {
      clearTimeout(refs.searchDebounceTimer);
    }
    refs.searchDebounceTimer = setTimeout(() => {
      refs.searchDebounceTimer = null;
      runSearch(query);
    }, constants.searchDebounceMs);
  }

  function ensureSearchResultsFresh() {
    if (!searchState.query) return;
    if (searchState.indexedTotal !== state.stats.totalMessages) {
      runSearch(searchState.query);
    }
  }

  function navigateSearch(direction) {
    ensureSearchResultsFresh();
    const results = searchState.results;
    if (!results.length) {
      updateSearchCountLabel();
      return;
    }

    let nextIndex =
      typeof searchState.activeIndex === "number"
        ? searchState.activeIndex
        : -1;
    nextIndex = (nextIndex + direction + results.length) % results.length;
    searchState.activeIndex = nextIndex;
    updateSearchCountLabel();
    focusSearchResult(results[nextIndex]);
  }

  function showSearchPanel() {
    const panel = ensureSearchPanel();
    if (!panel) return;
    panel.style.display = "flex";
    updateSearchCountLabel();
    if (refs.searchInput) refs.searchInput.focus();
  }

  function hideSearchPanel() {
    if (refs.searchPanel) refs.searchPanel.style.display = "none";
    clearSearchHighlight();
  }

  function toggleSearchPanel() {
    if (deps.isSidebarOpen()) {
      deps.openSidebar("search");
      return;
    }
    const panel = ensureSearchPanel();
    if (!panel) return;
    const isVisible = panel.style.display !== "none";
    if (isVisible) {
      hideSearchPanel();
    } else {
      showSearchPanel();
    }
  }

  function renderSearchTabContent(container) {
    const theme = deps.getThemeTokens();
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "6px";
    row.style.alignItems = "center";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search chat...";
    input.setAttribute("aria-label", "Search chat");
    input.style.flex = "1";
    input.style.minWidth = "0";
    input.style.height = "32px";
    input.style.borderRadius = "8px";
    input.style.padding = "0 10px";
    input.style.fontSize = "12px";
    input.style.fontFamily = "inherit";
    input.style.background = theme.inputBg;
    input.style.border = `1px solid ${theme.inputBorder}`;
    input.style.color = theme.text;
    input.value = searchState.query || "";
    input.addEventListener("input", (event) => scheduleSearch(event.target.value));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        navigateSearch(event.shiftKey ? -1 : 1);
      }
    });

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.textContent = "↑";
    deps.styleSearchButton(prevBtn, 24);
    prevBtn.style.display = "flex";
    prevBtn.style.background = theme.buttonMutedBg;
    prevBtn.style.color = theme.buttonMutedText;
    prevBtn.addEventListener("click", () => navigateSearch(-1));

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.textContent = "↓";
    deps.styleSearchButton(nextBtn, 24);
    nextBtn.style.display = "flex";
    nextBtn.style.background = theme.buttonMutedBg;
    nextBtn.style.color = theme.buttonMutedText;
    nextBtn.addEventListener("click", () => navigateSearch(1));

    row.appendChild(input);
    row.appendChild(prevBtn);
    row.appendChild(nextBtn);

    const count = document.createElement("div");
    count.style.fontSize = "11px";
    count.style.opacity = "0.8";
    count.style.padding = "2px 2px 6px";

    const totalSections = searchState.results.length;
    const active = totalSections && searchState.activeIndex >= 0 ? searchState.activeIndex + 1 : 0;
    count.textContent = `${active}/${totalSections} sections • ${searchState.matchCount} matches`;

    container.appendChild(row);
    container.appendChild(count);

    const resultsList = document.createElement("div");
    resultsList.setAttribute("data-gpt-boost-search-results", "1");
    resultsList.style.display = "flex";
    resultsList.style.flexDirection = "column";
    resultsList.style.gap = "6px";
    resultsList.style.overflowY = "auto";
    resultsList.style.minHeight = "0";
    resultsList.style.flex = "1";

    if (!searchState.results.length) {
      const empty = document.createElement("div");
      empty.style.fontSize = "12px";
      empty.style.opacity = "0.7";
      empty.style.padding = "4px 2px";
      empty.textContent = searchState.query ? "No matches found." : "Type to search the conversation.";
      resultsList.appendChild(empty);
    } else {
      const total = searchState.results.length;
      searchState.results.forEach((id, idx) => {
        const summary = getSearchResultSummary(id, idx, total);
        const roleStyle = deps.getRoleSurfaceStyle(summary.role, theme);
        const item = document.createElement("button");
        item.type = "button";
        item.style.textAlign = "left";
        item.style.border = `1px solid ${roleStyle.borderColor}`;
        item.style.borderLeft = `3px solid ${roleStyle.accentColor}`;
        item.style.borderRadius = "10px";
        item.style.padding = "8px";
        item.style.background = idx === searchState.activeIndex ? roleStyle.activeSurfaceBg : roleStyle.surfaceBg;
        item.style.color = theme.text;
        item.style.cursor = "pointer";
        item.style.fontFamily = "inherit";
        item.style.display = "flex";
        item.style.flexShrink = "0";
        item.style.flexDirection = "column";
        item.style.gap = "4px";
        item.addEventListener("click", () => {
          const previousScrollTop = resultsList.scrollTop;
          searchState.activeIndex = idx;
          updateSearchCountLabel();
          focusSearchResult(id);
          deps.renderSidebarTab("search");
          setTimeout(() => {
            const sidebarContentContainer = deps.getSidebarContentContainer();
            if (!sidebarContentContainer) return;
            const nextList = sidebarContentContainer.querySelector('[data-gpt-boost-search-results="1"]');
            if (nextList instanceof HTMLElement) {
              nextList.scrollTop = previousScrollTop;
            }
          }, 0);
        });

        const roleChip = deps.createRoleChip(roleStyle);

        const title = document.createElement("div");
        title.textContent = summary.title;
        title.style.fontSize = "12px";
        title.style.lineHeight = "1.35";
        title.style.wordBreak = "break-word";

        const subtitle = document.createElement("div");
        subtitle.textContent = summary.subtitle;
        subtitle.style.fontSize = "10px";
        subtitle.style.opacity = "0.72";

        item.appendChild(roleChip);
        item.appendChild(title);
        item.appendChild(subtitle);
        resultsList.appendChild(item);
      });
    }

    container.appendChild(resultsList);

    setTimeout(() => input.focus(), 0);
  }

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
    button.addEventListener("click", toggleSearchPanel);

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
      scheduleSearch(event.target.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        navigateSearch(event.shiftKey ? -1 : 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        hideSearchPanel();
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
    prevButton.addEventListener("click", () => navigateSearch(-1));

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.textContent = "↓";
    nextButton.setAttribute("aria-label", "Next match");
    deps.styleSearchButton(nextButton, 22);
    nextButton.style.display = "flex";
    nextButton.style.background = "rgba(148, 163, 184, 0.2)";
    nextButton.addEventListener("click", () => navigateSearch(1));

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close search");
    deps.styleSearchButton(closeButton, 22);
    closeButton.style.display = "flex";
    closeButton.style.background = "rgba(148, 163, 184, 0.2)";
    closeButton.addEventListener("click", hideSearchPanel);

    const sidebarButton = document.createElement("button");
    sidebarButton.type = "button";
    sidebarButton.textContent = "⇱";
    sidebarButton.setAttribute("aria-label", "Open search in sidebar");
    deps.styleSearchButton(sidebarButton, 22);
    sidebarButton.style.display = "flex";
    sidebarButton.style.background = "rgba(148, 163, 184, 0.2)";
    sidebarButton.addEventListener("click", () => {
      hideSearchPanel();
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

  function updateSearchVisibility(totalMessages) {
    const shouldShow = state.enabled;
    const button = ensureSearchButton();
    if (button) button.style.display = shouldShow ? "flex" : "none";
    if (!shouldShow) hideSearchPanel();
    deps.updateSidebarVisibility(totalMessages);
  }

  function hideSearchUi() {
    hideSearchPanel();
    if (refs.searchButton) refs.searchButton.style.display = "none";
  }

  return {
    clearSearchTextHighlights,
    clearSearchHighlight,
    highlightMatchesInElement,
    setSearchHighlight,
    updateSearchCountLabel,
    collectSearchTargets,
    getSearchResultSummary,
    focusSearchResult,
    rerenderSearchSidebarPreservingInputFocus,
    runSearch,
    scheduleSearch,
    ensureSearchResultsFresh,
    navigateSearch,
    showSearchPanel,
    hideSearchPanel,
    toggleSearchPanel,
    renderSearchTabContent,
    ensureSearchButton,
    ensureSearchPanel,
    updateSearchVisibility,
    hideSearchUi
  };
}
