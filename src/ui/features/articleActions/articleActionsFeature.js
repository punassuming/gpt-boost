import { createSvgIcon } from '../../shell/icons.js';

export function createArticleActionsFeature({
  state,
  constants,
  deps
}) {
  function parsePx(value, fallback = 0) {
    const parsed = Number.parseFloat(String(value || "").trim().replace("px", ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getExpandedPaddingPx(target) {
    if (!(target instanceof HTMLElement)) return constants.messageHoverExtraPaddingPx;
    const baseline =
      target.dataset.gptBoostOrigComputedPaddingLeft ||
      getComputedStyle(target).paddingLeft ||
      "0px";
    return Math.max(0, parsePx(baseline, 0)) + constants.messageHoverExtraPaddingPx;
  }

  function setArticleActionIcon(btn, iconName) {
    const iconMap = {
      collapse: 'chevronDown',
      expand: 'chevronUp',
      pin: 'pin',
      bookmark: 'bookmark'
    };
    btn.replaceChildren(createSvgIcon(iconMap[iconName] || 'spark', 13));
  }

  function styleActionButton(button, iconName, isActive, theme) {
    if (!(button instanceof HTMLElement)) return;
    const baseBorder = theme.inputBorder || theme.panelBorder;
    const activeBackground = iconName === 'pin'
      ? 'rgba(234,179,8,0.68)'
      : iconName === 'bookmark'
        ? 'rgba(59,130,246,0.65)'
        : theme.buttonMutedBg;
    const activeBorder = iconName === 'pin'
      ? 'rgba(234,179,8,0.92)'
      : iconName === 'bookmark'
        ? 'rgba(59,130,246,0.9)'
        : theme.panelBorder;
    button.dataset.gptBoostActive = isActive ? '1' : '0';
    button.style.opacity = isActive ? '1' : '0.92';
    button.style.background = isActive ? activeBackground : theme.inputBg;
    button.style.color = isActive ? theme.buttonText : theme.text;
    button.style.border = `1px solid ${isActive ? activeBorder : baseBorder}`;
    button.style.boxShadow = isActive ? '0 4px 10px rgba(15,23,42,0.14)' : 'none';
  }

  function createArticleActionButton(iconName, label, theme) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    btn.style.width = "26px";
    btn.style.height = "26px";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.padding = "0";
    btn.style.transition = "transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease";
    setArticleActionIcon(btn, iconName);
    styleActionButton(btn, iconName, false, theme);
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-1px)";
      btn.style.opacity = "1";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translateY(0)";
      btn.style.opacity = btn.dataset.gptBoostActive === '1' ? '1' : '0.92';
    });
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
    const theme = deps.getThemeTokens();

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
    sideRail.style.left = `${constants.messageRailOutsideLeftPx}px`;
    sideRail.style.transform = "none";
    sideRail.style.marginTop = "";
    sideRail.style.alignSelf = "";
    sideRail.style.flexDirection = "column";
    sideRail.style.gap = "4px";
    sideRail.style.padding = "2px";
    sideRail.style.border = `1px solid ${theme.panelBorder}`;
    sideRail.style.background = theme.panelBg;
    if (sideRail.parentElement !== article) {
      article.appendChild(sideRail);
    }
    if (hoverTarget instanceof HTMLElement) {
      hoverTarget.style.paddingLeft = `${getExpandedPaddingPx(hoverTarget)}px`;
    } else {
      article.style.paddingLeft = `${getExpandedPaddingPx(article)}px`;
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

  function updateCollapseButtonAppearance(article, virtualId) {
    const collapseBtn = article.querySelector("[data-gpt-boost-collapse-btn]");
    if (!(collapseBtn instanceof HTMLElement)) return;
    styleActionButton(collapseBtn, 'collapse', state.collapsedMessages.has(virtualId), deps.getThemeTokens());
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
      sideRail.style.opacity = "1";
      sideRail.style.pointerEvents = "auto";
    }
    if (collapseBtn) {
      setArticleActionIcon(collapseBtn, isCollapsed ? "expand" : "collapse");
      collapseBtn.setAttribute("aria-label", isCollapsed ? "Expand message" : "Collapse message");
    }
    updateCollapseButtonAppearance(article, virtualId);
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
    styleActionButton(pinBtn, 'pin', isPinned, deps.getThemeTokens());
    pinBtn.setAttribute("aria-label", isPinned ? "Unpin message" : "Pin message to top");
  }

  function updateBookmarkButtonAppearance(article, virtualId) {
    const bookmarkBtn = article.querySelector("[data-gpt-boost-bookmark-btn]");
    if (!bookmarkBtn) return;
    const isBookmarked = state.bookmarkedMessages.has(virtualId);
    styleActionButton(bookmarkBtn, 'bookmark', isBookmarked, deps.getThemeTokens());
    bookmarkBtn.setAttribute("aria-label", isBookmarked ? "Remove bookmark" : "Bookmark message");
  }

  function applyTheme(theme = deps.getThemeTokens()) {
    document.querySelectorAll("[data-gpt-boost-ui-injected='1']").forEach((article) => {
      if (!(article instanceof HTMLElement)) return;
      const virtualId = article.dataset.virtualId || "";
      const sideRail = article.querySelector("[data-gpt-boost-side-rail]");
      const snippet = article.querySelector("[data-gpt-boost-snippet]");
      if (sideRail instanceof HTMLElement) {
        sideRail.style.background = theme.panelBg;
        sideRail.style.border = `1px solid ${theme.panelBorder}`;
        sideRail.style.boxShadow = theme.panelShadow;
      }
      if (snippet instanceof HTMLElement) {
        snippet.style.border = `1px solid ${theme.panelBorder}`;
        snippet.style.background = theme.inputBg;
        snippet.style.color = theme.mutedText;
      }
      updateCollapseButtonAppearance(article, virtualId);
      updatePinButtonAppearance(article, virtualId);
      updateBookmarkButtonAppearance(article, virtualId);
    });
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
    if (hoverTarget instanceof HTMLElement && !hoverTarget.dataset.gptBoostOrigComputedPaddingLeft) {
      hoverTarget.dataset.gptBoostOrigComputedPaddingLeft = getComputedStyle(hoverTarget).paddingLeft || "0px";
    }
    if (!article.dataset.gptBoostOrigComputedPaddingLeft) {
      article.dataset.gptBoostOrigComputedPaddingLeft = getComputedStyle(article).paddingLeft || "0px";
    }

    const sideRail = document.createElement("div");
    sideRail.setAttribute("data-gpt-boost-side-rail", "1");
    sideRail.style.position = "absolute";
    sideRail.style.left = `${constants.messageRailOutsideLeftPx}px`;
    sideRail.style.top = "8px";
    sideRail.style.transform = "none";
    sideRail.style.display = "flex";
    sideRail.style.flexDirection = "column";
    sideRail.style.gap = "4px";
    sideRail.style.zIndex = "103";
    sideRail.style.alignItems = "center";
    sideRail.style.padding = "2px";
    sideRail.style.borderRadius = "8px";
    sideRail.style.opacity = "1";
    sideRail.style.pointerEvents = "auto";
    sideRail.style.transition = "background 0.15s ease, opacity 0.15s ease, border-color 0.15s ease";

    const theme = deps.getThemeTokens();
    const collapseBtn = createArticleActionButton("collapse", "Collapse message", theme);
    collapseBtn.setAttribute("data-gpt-boost-collapse-btn", "1");
    collapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCollapse(virtualId);
    });

    const pinBtn = createArticleActionButton("pin", "Pin message to top", theme);
    pinBtn.setAttribute("data-gpt-boost-pin-btn", "1");
    pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deps.togglePin(virtualId);
    });

    const bookmarkBtn = createArticleActionButton("bookmark", "Bookmark message", theme);
    bookmarkBtn.setAttribute("data-gpt-boost-bookmark-btn", "1");
    bookmarkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deps.toggleBookmark(virtualId);
    });

    sideRail.appendChild(collapseBtn);
    sideRail.appendChild(pinBtn);
    sideRail.appendChild(bookmarkBtn);
    article.appendChild(sideRail);
    updateArticleSideRailLayout(article, sideRail);

    article.addEventListener("mouseenter", () => {
      const isCollapsed = state.collapsedMessages.has(virtualId);
      if (hoverTarget instanceof HTMLElement) {
        hoverTarget.style.boxShadow = constants.articleHoverHighlightShadow;
        hoverTarget.style.borderRadius = "12px";
        hoverTarget.style.outline = "1px solid rgba(59,130,246,0.1)";
        hoverTarget.style.outlineOffset = "3px";
      }
      if (!isCollapsed) {
        sideRail.style.background = deps.getThemeTokens().buttonMutedBg;
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
        sideRail.style.background = deps.getThemeTokens().panelBg;
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
    applyTheme(theme);
  }

  function cleanupInjectedUi() {
    document.querySelectorAll("[data-gpt-boost-ui-injected]").forEach((el) => {
      el.removeAttribute("data-gpt-boost-ui-injected");
      const overlay = el.querySelector("[data-gpt-boost-overlay]");
      if (overlay) overlay.remove();
      const sideRail = el.querySelector("[data-gpt-boost-side-rail]");
      if (sideRail) sideRail.remove();
      const snippet = el.querySelector("[data-gpt-boost-snippet]");
      if (snippet) snippet.remove();
      el.querySelectorAll("[data-gpt-boost-orig-display]").forEach((row) => {
        if (!(row instanceof HTMLElement)) return;
        row.style.display = row.dataset.gptBoostOrigDisplay || "";
        delete row.dataset.gptBoostOrigDisplay;
      });
      if (el instanceof HTMLElement) {
        el.style.boxShadow = "";
        const hoverTarget = getArticleHoverTarget(el);
        if (hoverTarget instanceof HTMLElement) {
          hoverTarget.style.boxShadow = "";
          hoverTarget.style.borderRadius = "";
          hoverTarget.style.outline = "";
          hoverTarget.style.outlineOffset = "";
          const hoverOriginalPaddingLeft = hoverTarget.dataset.gptBoostOrigPaddingLeft || "";
          hoverTarget.style.paddingLeft = hoverOriginalPaddingLeft;
          delete hoverTarget.dataset.gptBoostOrigPaddingLeft;
          delete hoverTarget.dataset.gptBoostOrigComputedPaddingLeft;
          const hoverOverlay = hoverTarget.querySelector("[data-gpt-boost-overlay]");
          if (hoverOverlay) hoverOverlay.remove();
        }
        const originalPaddingLeft = el.dataset.gptBoostOrigPaddingLeft || "";
        el.style.paddingLeft = originalPaddingLeft;
        delete el.dataset.gptBoostOrigPaddingLeft;
        delete el.dataset.gptBoostOrigComputedPaddingLeft;
      }
    });
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
    refreshArticleSideRailLayout,
    applyTheme,
    cleanupInjectedUi
  };
}
