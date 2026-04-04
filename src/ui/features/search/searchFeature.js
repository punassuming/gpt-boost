import {
  clearSearchTextHighlights as clearHighlightsInElement,
  highlightMatchesInElement as highlightMatches,
  setActiveSearchMatch
} from './searchHighlighting.js';
import {
  collectSearchTargets as collectTargets,
  summarizeSearchResult,
  findSearchMatches
} from './searchIndex.js';
import { renderSearchSidebarTab } from './searchSidebarTab.js';
import { createSearchFloatingUi } from './searchFloatingUi.js';

export function createSearchFeature({
  refs,
  searchState,
  state,
  constants,
  deps
}) {
  const floatingUi = createSearchFloatingUi({
    refs,
    constants,
    deps,
    callbacks: {
      toggleSearchPanel,
      scheduleSearch,
      navigateSearch,
      hideSearchPanel
    }
  });
  let focusToken = 0;

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
    return highlightMatches(element, query);
  }

  function setSearchHighlight(element, matchIndexWithinMessage = 0) {
    if (!(element instanceof HTMLElement)) return;
    clearSearchHighlight();
    element.style.outline = "2px solid #fbbf24";
    element.style.outlineOffset = "2px";
    element.style.borderRadius = "8px";
    highlightMatchesInElement(element, searchState.query);
    const activeMark = setActiveSearchMatch(element, matchIndexWithinMessage);
    if (activeMark instanceof HTMLElement) {
      activeMark.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
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

  function getSearchResultVirtualIds() {
    return searchState.resultVirtualIds instanceof Set
      ? searchState.resultVirtualIds
      : new Set();
  }

  function getSearchResultSummary(result, index, total) {
    return summarizeSearchResult({
      result,
      index,
      total,
      articleMap: state.articleMap,
      getMessageRole: deps.getMessageRole
    });
  }

  function focusSearchResult(result) {
    if (!result || !result.id) return;
    const token = ++focusToken;
    deps.scrollToVirtualId(result.id, {
      allowRetry: false,
      behavior: "auto",
      block: "nearest"
    });

    const selectorId = deps.escapeSelectorValue(result.id);
    const applyFocusedMatch = (attempt = 0) => {
      if (token !== focusToken) return;
      const refreshed =
        document.querySelector(`article[data-virtual-id="${selectorId}"]`) ||
        document.querySelector(`[data-virtual-id="${selectorId}"]:not([data-chatgpt-virtual-spacer="1"])`);
      if (refreshed instanceof HTMLElement) {
        setSearchHighlight(refreshed, result.matchIndexWithinMessage || 0);
        return;
      }
      if (attempt >= 4) return;
      setTimeout(() => applyFocusedMatch(attempt + 1), 180);
    };

    setTimeout(() => applyFocusedMatch(0), 220);
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
      searchState.resultVirtualIds = new Set();
      updateSearchCountLabel();
      clearSearchHighlight();
      rerenderSearchSidebarPreservingInputFocus();
      deps.onResultsChanged?.();
      return;
    }

    searchState.results = results;
    searchState.activeIndex = results.length ? 0 : -1;
    searchState.indexedTotal = state.stats.totalMessages;
    searchState.matchCount = matchCount;
    searchState.resultVirtualIds = new Set(
      results
        .map((result) => result && result.id)
        .filter(Boolean)
    );

    updateSearchCountLabel();
    if (!results.length) {
      clearSearchHighlight();
    }
    rerenderSearchSidebarPreservingInputFocus();
    if (deps.isSidebarOpen() && deps.getActiveSidebarTab() !== "search") {
      deps.refreshSidebarTab();
    }
    deps.onResultsChanged?.();
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
    renderSearchSidebarTab({
      container,
      theme: deps.getThemeTokens(),
      searchState,
      styleSearchButton: deps.styleSearchButton,
      getSearchResultSummary,
      scheduleSearch,
      navigateSearch,
      updateSearchCountLabel,
      focusSearchResult,
      createRoleChip: deps.createRoleChip,
      getRoleSurfaceStyle: deps.getRoleSurfaceStyle,
      renderSidebarTab: deps.renderSidebarTab,
      getSidebarContentContainer: deps.getSidebarContentContainer
    });
  }

  function ensureSearchButton() {
    return floatingUi.ensureSearchButton();
  }

  function ensureSearchPanel() {
    return floatingUi.ensureSearchPanel();
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
    getSearchResultVirtualIds,
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
