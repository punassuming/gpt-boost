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
  const MIN_SEARCH_QUERY_LENGTH = 3;
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

  function computeResultMatchRatio(result) {
    const textLength = Math.max(1, Number(result?.textLength || 0) || 1);
    const start = Math.max(0, Number(result?.start || 0) || 0);
    const length = Math.max(1, Number(result?.length || 0) || 1);
    const center = Math.min(textLength - 1, start + (length / 2));
    return Math.max(0, Math.min(1, center / Math.max(1, textLength - 1)));
  }

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
    highlightMatchesInElement(element, searchState.query);
    const activeMark = setActiveSearchMatch(element, matchIndexWithinMessage);
    if (activeMark instanceof HTMLElement) {
      activeMark.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
    refs.highlightedSearchElement = element;
  }

  function clearSearchHighlightFromElement(element) {
    if (!(element instanceof HTMLElement)) return;
    if (!element.dataset.gptBoostSearchQuery && refs.highlightedSearchElement !== element) return;
    clearSearchTextHighlights(element);
    if (element.dataset.gptBoostSearchQuery) {
      delete element.dataset.gptBoostSearchQuery;
    }
    if (refs.highlightedSearchElement === element) {
      refs.highlightedSearchElement = null;
    }
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

  function getSearchMatchRatiosByVirtualId() {
    return searchState.resultMatchRatiosByVirtualId instanceof Map
      ? searchState.resultMatchRatiosByVirtualId
      : new Map();
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
    const isTooShort = normalized && normalized.length < MIN_SEARCH_QUERY_LENGTH;

    if (!normalized || isTooShort) {
      searchState.results = [];
      searchState.activeIndex = -1;
      searchState.indexedTotal = state.stats.totalMessages;
      searchState.matchCount = 0;
      searchState.resultVirtualIds = new Set();
      searchState.resultMatchRatiosByVirtualId = new Map();
      updateSearchCountLabel();
      clearSearchHighlight();
      syncSearchHighlightsForRenderedArticles();
      rerenderSearchSidebarPreservingInputFocus();
      deps.onResultsChanged?.();
      return;
    }

    searchState.results = results;
    searchState.activeIndex = results.length ? 0 : -1;
    searchState.indexedTotal = state.stats.totalMessages;
    searchState.matchCount = matchCount;
    const resultVirtualIds = new Set();
    const resultMatchRatiosByVirtualId = new Map();
    results.forEach((result) => {
      const id = result?.id;
      if (!id) return;
      resultVirtualIds.add(id);
      const bucket = resultMatchRatiosByVirtualId.get(id) || [];
      bucket.push(computeResultMatchRatio(result));
      resultMatchRatiosByVirtualId.set(id, bucket);
    });
    searchState.resultVirtualIds = resultVirtualIds;
    searchState.resultMatchRatiosByVirtualId = resultMatchRatiosByVirtualId;

    updateSearchCountLabel();
    if (!results.length) {
      clearSearchHighlight();
    }
    syncSearchHighlightsForRenderedArticles();
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

  function syncSearchHighlightsForRenderedArticles() {
    const renderedNodes = typeof deps.getActiveConversationNodes === "function"
      ? deps.getActiveConversationNodes()
      : [];
    if (!Array.isArray(renderedNodes) || !renderedNodes.length) return;

    const query = String(searchState.query || "").trim();
    const activeResult = (
      Array.isArray(searchState.results) &&
      searchState.activeIndex >= 0 &&
      searchState.activeIndex < searchState.results.length
    )
      ? searchState.results[searchState.activeIndex]
      : null;
    const hitIds = getSearchResultVirtualIds();
    let nextHighlightedElement = null;

    renderedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const id = node.dataset.virtualId;
      if (!id || !query || !hitIds.has(id)) {
        clearSearchHighlightFromElement(node);
        return;
      }

      const highlightedForSameQuery = node.dataset.gptBoostSearchQuery === query;
      const hasExistingMarks = node.querySelector('mark[data-chatgpt-virtual-search="hit"]');
      if (!highlightedForSameQuery || !hasExistingMarks) {
        highlightMatchesInElement(node, query);
        node.dataset.gptBoostSearchQuery = query;
      }

      if (activeResult && activeResult.id === id) {
        const activeMark = setActiveSearchMatch(node, activeResult.matchIndexWithinMessage || 0);
        if (activeMark instanceof HTMLElement) {
          nextHighlightedElement = node;
        }
      }
    });

    if (nextHighlightedElement instanceof HTMLElement) {
      refs.highlightedSearchElement = nextHighlightedElement;
    } else if (refs.highlightedSearchElement && !refs.highlightedSearchElement.isConnected) {
      refs.highlightedSearchElement = null;
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
    getSearchMatchRatiosByVirtualId,
    getSearchResultSummary,
    focusSearchResult,
    rerenderSearchSidebarPreservingInputFocus,
    runSearch,
    scheduleSearch,
    ensureSearchResultsFresh,
    syncSearchHighlightsForRenderedArticles,
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
