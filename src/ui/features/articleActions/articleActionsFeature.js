export function createArticleActionsFeature({
  state,
  constants,
  deps
}) {
  function setArticleActionIcon(btn, iconName) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.style.width = "13px";
    svg.style.height = "13px";
    svg.style.fill = "none";
    svg.style.stroke = "currentColor";
    svg.style.strokeWidth = "2";
    svg.style.strokeLinecap = "round";
    svg.style.strokeLinejoin = "round";

    const path = document.createElementNS(ns, "path");
    if (iconName === "collapse") {
      path.setAttribute("d", "M6 9l6 6 6-6");
    } else if (iconName === "expand") {
      path.setAttribute("d", "M6 15l6-6 6 6");
    } else if (iconName === "pin") {
      path.setAttribute("d", "M12 17v5M8 3l8 8M6 5l5 5-6 4 4-6 5 5");
    } else if (iconName === "bookmark") {
      path.setAttribute("d", "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z");
    }
    svg.appendChild(path);
    btn.replaceChildren(svg);
  }

  function createArticleActionButton(iconName, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    btn.style.width = "24px";
    btn.style.height = "24px";
    btn.style.borderRadius = "6px";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.padding = "0";
    btn.style.opacity = "0.85";
    btn.style.background = "rgba(17,24,39,0.7)";
    btn.style.color = "#f9fafb";
    btn.style.border = "1px solid rgba(148,163,184,0.45)";
    btn.style.transition = "opacity 0.15s, background 0.15s";
    setArticleActionIcon(btn, iconName);
    btn.addEventListener("mouseenter", () => { btn.style.opacity = "1"; });
    btn.addEventListener("mouseleave", () => { btn.style.opacity = "0.85"; });
    return btn;
  }

  function getArticleHoverTarget(article) {
    if (!(article instanceof HTMLElement)) return article;
    const messageContainer =
      article.querySelector("[data-message-author-role]") ||
      article.querySelector(".markdown") ||
      article;
    return messageContainer instanceof HTMLElement ? messageContainer : article;
  }

  function getDirectChildAncestor(container, node) {
    if (!(container instanceof HTMLElement) || !(node instanceof HTMLElement)) return null;
    let current = node;
    while (current && current.parentElement && current.parentElement !== container) {
      current = current.parentElement;
    }
    return current && current.parentElement === container ? current : null;
  }

  function getArticleNativeActionRows(article) {
    if (!(article instanceof HTMLElement)) return [];

    const markerSelector = [
      'button[data-testid="copy-turn-action-button"]',
      'button[data-testid="good-response-turn-action-button"]',
      'button[data-testid="bad-response-turn-action-button"]',
      'button[aria-label="More actions"]',
      'button[aria-label="Switch model"]'
    ].join(",");

    const rows = new Set();
    article.querySelectorAll(markerSelector).forEach((btn) => {
      if (!(btn instanceof HTMLElement)) return;
      const directChild = getDirectChildAncestor(article, btn.closest("div") || btn);
      if (!(directChild instanceof HTMLElement)) return;
      if (directChild.hasAttribute("data-gpt-boost-side-rail")) return;
      if (directChild.hasAttribute("data-gpt-boost-snippet")) return;
      rows.add(directChild);
    });

    return Array.from(rows);
  }

  function updateArticleSideRailLayout(article, sideRail) {
    if (!(article instanceof HTMLElement) || !(sideRail instanceof HTMLElement)) return;
    const virtualId = article.dataset.virtualId;
    const isCollapsed = !!(virtualId && state.collapsedMessages.has(virtualId));
    const hoverTarget = getArticleHoverTarget(article);

    if (isCollapsed) {
      if (hoverTarget instanceof HTMLElement) {
        hoverTarget.style.paddingLeft = hoverTarget.dataset.gptBoostOrigPaddingLeft || "";
      } else {
        article.style.paddingLeft = article.dataset.gptBoostOrigPaddingLeft || "";
      }

      sideRail.style.position = "static";
      sideRail.style.top = "";
      sideRail.style.left = "";
      sideRail.style.transform = "";
      sideRail.style.marginTop = "4px";
      sideRail.style.alignSelf = "flex-end";
      sideRail.style.flexDirection = "row";
      sideRail.style.gap = "4px";
      sideRail.style.padding = "0";
      sideRail.style.border = "none";
      sideRail.style.background = "transparent";
      if (sideRail.parentElement !== article) {
        article.appendChild(sideRail);
      } else {
        article.appendChild(sideRail);
      }
      return;
    }

    sideRail.style.position = "absolute";
    sideRail.style.top = "8px";
    sideRail.style.left = `${constants.messageRailInsideLeftPx}px`;
    sideRail.style.transform = "none";
    sideRail.style.marginTop = "";
    sideRail.style.alignSelf = "";
    sideRail.style.flexDirection = "column";
    sideRail.style.gap = "4px";
    sideRail.style.padding = "2px";
    sideRail.style.border = "1px solid rgba(148,163,184,0.35)";
    sideRail.style.background = "rgba(15,23,42,0.35)";
    if (hoverTarget instanceof HTMLElement) {
      if (sideRail.parentElement !== hoverTarget) {
        hoverTarget.appendChild(sideRail);
      }
      hoverTarget.style.paddingLeft = `${constants.messageRailInsidePaddingPx}px`;
    } else {
      if (sideRail.parentElement !== article) {
        article.appendChild(sideRail);
      }
      article.style.paddingLeft = `${constants.messageRailInsidePaddingPx}px`;
    }
  }

  function refreshArticleSideRailLayout() {
    document.querySelectorAll('[data-gpt-boost-ui-injected="1"]').forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const sideRail = el.querySelector("[data-gpt-boost-side-rail]");
      if (sideRail instanceof HTMLElement) {
        updateArticleSideRailLayout(el, sideRail);
      }
    });
  }

  function applyCollapseState(article, virtualId) {
    const isCollapsed = state.collapsedMessages.has(virtualId);
    const contentArea = article.querySelector("[data-message-author-role]");
    const snippet = article.querySelector("[data-gpt-boost-snippet]");
    const sideRail = article.querySelector("[data-gpt-boost-side-rail]");
    const collapseBtn = sideRail && sideRail.querySelector("[data-gpt-boost-collapse-btn]");
    const nativeActionRows = getArticleNativeActionRows(article);

    if (contentArea) {
      contentArea.style.display = isCollapsed ? "none" : "";
    }
    nativeActionRows.forEach((row) => {
      if (!row.dataset.gptBoostOrigDisplay) {
        row.dataset.gptBoostOrigDisplay = row.style.display || "";
      }
      row.style.display = isCollapsed ? "none" : row.dataset.gptBoostOrigDisplay;
    });
    if (snippet) {
      snippet.style.display = isCollapsed ? "block" : "none";
    }
    if (sideRail instanceof HTMLElement) {
      updateArticleSideRailLayout(article, sideRail);
      if (isCollapsed) {
        sideRail.style.opacity = "1";
        sideRail.style.pointerEvents = "auto";
      } else {
        sideRail.style.opacity = "0";
        sideRail.style.pointerEvents = "none";
      }
    }
    if (collapseBtn) {
      setArticleActionIcon(collapseBtn, isCollapsed ? "expand" : "collapse");
      collapseBtn.setAttribute("aria-label", isCollapsed ? "Expand message" : "Collapse message");
    }
    article.style.borderLeft = isCollapsed ? "3px solid rgba(148,163,184,0.55)" : "";
    article.style.background = isCollapsed ? "rgba(148,163,184,0.08)" : "";
    article.style.borderRadius = isCollapsed ? "10px" : "";
  }

  function toggleCollapse(virtualId) {
    if (state.collapsedMessages.has(virtualId)) {
      state.collapsedMessages.delete(virtualId);
    } else {
      state.collapsedMessages.add(virtualId);
    }
    const article = state.articleMap.get(virtualId);
    if (article) applyCollapseState(article, virtualId);
    deps.refreshSidebarTab();
  }

  function updatePinButtonAppearance(article, virtualId) {
    const pinBtn = article.querySelector("[data-gpt-boost-pin-btn]");
    if (!pinBtn) return;
    const isPinned = state.pinnedMessages.has(virtualId);
    pinBtn.style.opacity = isPinned ? "1" : "0.85";
    pinBtn.style.background = isPinned ? "rgba(234,179,8,0.75)" : "rgba(17,24,39,0.7)";
    pinBtn.setAttribute("aria-label", isPinned ? "Unpin message" : "Pin message to top");
  }

  function updateBookmarkButtonAppearance(article, virtualId) {
    const bookmarkBtn = article.querySelector("[data-gpt-boost-bookmark-btn]");
    if (!bookmarkBtn) return;
    const isBookmarked = state.bookmarkedMessages.has(virtualId);
    bookmarkBtn.style.opacity = isBookmarked ? "1" : "0.85";
    bookmarkBtn.style.background = isBookmarked ? "rgba(59,130,246,0.75)" : "rgba(17,24,39,0.7)";
    bookmarkBtn.setAttribute("aria-label", isBookmarked ? "Remove bookmark" : "Bookmark message");
  }

  function injectArticleUi(article, virtualId) {
    if (article.dataset.gptBoostUiInjected) return;
    article.dataset.gptBoostUiInjected = "1";

    if (getComputedStyle(article).position === "static") {
      article.style.position = "relative";
    }
    if (!article.dataset.gptBoostOrigPaddingLeft) {
      article.dataset.gptBoostOrigPaddingLeft = article.style.paddingLeft || "";
    }
    article.style.paddingLeft = article.dataset.gptBoostOrigPaddingLeft;
    article.style.transition = "box-shadow 0.15s ease";
    const hoverTarget = getArticleHoverTarget(article);
    if (hoverTarget instanceof HTMLElement && getComputedStyle(hoverTarget).position === "static") {
      hoverTarget.style.position = "relative";
    }
    if (hoverTarget instanceof HTMLElement && !hoverTarget.dataset.gptBoostOrigPaddingLeft) {
      hoverTarget.dataset.gptBoostOrigPaddingLeft = hoverTarget.style.paddingLeft || "";
    }

    const sideRail = document.createElement("div");
    sideRail.setAttribute("data-gpt-boost-side-rail", "1");
    sideRail.style.position = "absolute";
    sideRail.style.left = `${constants.messageRailInsideLeftPx}px`;
    sideRail.style.top = "8px";
    sideRail.style.transform = "none";
    sideRail.style.display = "flex";
    sideRail.style.flexDirection = "column";
    sideRail.style.gap = "4px";
    sideRail.style.zIndex = "103";
    sideRail.style.alignItems = "center";
    sideRail.style.padding = "2px";
    sideRail.style.borderRadius = "8px";
    sideRail.style.background = "rgba(15,23,42,0.35)";
    sideRail.style.opacity = "0";
    sideRail.style.pointerEvents = "none";
    sideRail.style.border = "1px solid rgba(148,163,184,0.35)";
    sideRail.style.transition = "background 0.15s ease, opacity 0.15s ease";

    const collapseBtn = createArticleActionButton("collapse", "Collapse message");
    collapseBtn.setAttribute("data-gpt-boost-collapse-btn", "1");
    collapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCollapse(virtualId);
    });

    const pinBtn = createArticleActionButton("pin", "Pin message to top");
    pinBtn.setAttribute("data-gpt-boost-pin-btn", "1");
    pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deps.togglePin(virtualId);
    });

    const bookmarkBtn = createArticleActionButton("bookmark", "Bookmark message");
    bookmarkBtn.setAttribute("data-gpt-boost-bookmark-btn", "1");
    bookmarkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deps.toggleBookmark(virtualId);
    });

    sideRail.appendChild(collapseBtn);
    sideRail.appendChild(pinBtn);
    sideRail.appendChild(bookmarkBtn);
    (hoverTarget instanceof HTMLElement ? hoverTarget : article).appendChild(sideRail);
    updateArticleSideRailLayout(article, sideRail);

    article.addEventListener("mouseenter", () => {
      const isCollapsed = state.collapsedMessages.has(virtualId);
      if (hoverTarget instanceof HTMLElement) {
        hoverTarget.style.boxShadow = constants.articleHoverHighlightShadow;
        hoverTarget.style.borderRadius = "12px";
        hoverTarget.style.outline = "1px solid rgba(59,130,246,0.18)";
        hoverTarget.style.outlineOffset = "4px";
      }
      if (!isCollapsed) {
        sideRail.style.background = "rgba(59,130,246,0.2)";
        sideRail.style.opacity = "1";
        sideRail.style.pointerEvents = "auto";
      }
    });
    article.addEventListener("mouseleave", () => {
      const isCollapsed = state.collapsedMessages.has(virtualId);
      if (hoverTarget instanceof HTMLElement) {
        hoverTarget.style.boxShadow = "";
        hoverTarget.style.borderRadius = "";
        hoverTarget.style.outline = "";
        hoverTarget.style.outlineOffset = "";
      }
      if (!isCollapsed) {
        sideRail.style.background = "rgba(15,23,42,0.35)";
        sideRail.style.opacity = "0";
        sideRail.style.pointerEvents = "none";
      }
    });

    const snippet = document.createElement("div");
    snippet.setAttribute("data-gpt-boost-snippet", "1");
    snippet.style.display = "none";
    snippet.style.fontSize = "13px";
    snippet.style.opacity = "0.65";
    snippet.style.overflow = "hidden";
    snippet.style.whiteSpace = "nowrap";
    snippet.style.textOverflow = "ellipsis";
    snippet.style.padding = "6px 8px";
    snippet.style.marginTop = "6px";
    snippet.style.maxWidth = "100%";
    snippet.style.boxSizing = "border-box";
    snippet.style.border = "1px solid rgba(148,163,184,0.35)";
    snippet.style.borderRadius = "8px";
    snippet.style.background = "rgba(148,163,184,0.08)";

    const textSource = article.querySelector("[data-message-author-role]") || article;
    const rawText = (textSource.textContent || "").trim().replace(/\s+/g, " ");
    snippet.textContent = rawText.length > constants.articleSnippetLength
      ? rawText.slice(0, constants.articleSnippetLength) + "…"
      : rawText;

    article.appendChild(snippet);
  }

  return {
    setArticleActionIcon,
    createArticleActionButton,
    applyCollapseState,
    toggleCollapse,
    updatePinButtonAppearance,
    updateBookmarkButtonAppearance,
    getArticleHoverTarget,
    getDirectChildAncestor,
    getArticleNativeActionRows,
    injectArticleUi,
    updateArticleSideRailLayout,
    refreshArticleSideRailLayout
  };
}
