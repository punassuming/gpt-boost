import { createSvgIcon } from '../../shell/icons.js';

export function createArticleActionsFeature({
  state,
  constants,
  deps
}) {
  function setArticleActionIcon(btn, iconName) {
    const iconMap = {
      collapse: 'chevronDown',
      expand: 'chevronUp',
      pin: 'pin',
      bookmark: 'bookmark'
    };
    const iconWrap = document.createElement("span");
    iconWrap.className = "flex items-center justify-center touch:w-10 h-8 w-8";
    iconWrap.appendChild(createSvgIcon(iconMap[iconName] || 'spark', 16));
    btn.replaceChildren(iconWrap);
  }

  function createArticleActionButton(iconName, label, theme) {
    void theme;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    btn.className = "text-token-text-secondary hover:bg-token-bg-secondary rounded-lg";
    btn.style.cursor = "pointer";
    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.style.padding = "0";
    setArticleActionIcon(btn, iconName);
    return btn;
  }

  function styleInlineActionButton(button, iconName, isActive, theme) {
    if (!(button instanceof HTMLElement)) return;
    if (!button.className.includes("text-token-text-secondary")) {
      button.className = "text-token-text-secondary hover:bg-token-bg-secondary rounded-lg";
    }
    button.style.minWidth = "";
    button.style.borderRadius = "";
    button.style.border = "none";
    button.style.padding = "0";
    button.style.background = isActive ? theme.buttonMutedBg : "transparent";
    button.style.color = isActive ? theme.text : theme.buttonMutedText;
    button.style.boxShadow = "none";
    button.style.opacity = "1";
    if (iconName === "pin" && isActive) {
      button.style.color = "#facc15";
    } else if (iconName === "bookmark" && isActive) {
      button.style.color = "#60a5fa";
    }
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

  function getResponseActionsGroup(article) {
    if (!(article instanceof HTMLElement)) return null;
    const group = article.querySelector('div[aria-label="Response actions"][role="group"]');
    return group instanceof HTMLElement ? group : null;
  }

  function ensureInlineActionsHost(article) {
    const group = getResponseActionsGroup(article);
    if (!(group instanceof HTMLElement)) return null;
    const existing = group.querySelector("[data-gpt-boost-inline-actions]");
    if (existing instanceof HTMLElement) return existing;

    const host = document.createElement("div");
    host.setAttribute("data-gpt-boost-inline-actions", "1");
    host.style.display = "inline-flex";
    host.style.alignItems = "center";
    host.style.gap = "2px";
    host.style.pointerEvents = "auto";

    const sourcesButton = Array.from(group.querySelectorAll("button")).find((btn) => {
      if (!(btn instanceof HTMLElement)) return false;
      const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
      return aria === "sources";
    });
    if (sourcesButton instanceof HTMLElement) {
      group.insertBefore(host, sourcesButton);
    } else {
      group.appendChild(host);
    }
    return host;
  }

  function updateArticleSideRailLayout(article, sideRail) {
    void article;
    if (!(sideRail instanceof HTMLElement)) return;
    sideRail.style.display = "none";
  }

  function refreshArticleSideRailLayout() {
    document.querySelectorAll('[data-gpt-boost-ui-injected="1"]').forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const sideRail = el.querySelector("[data-gpt-boost-side-rail]");
      if (sideRail instanceof HTMLElement) updateArticleSideRailLayout(el, sideRail);
    });
  }

  function updateCollapseButtonAppearance(article, virtualId) {
    let collapseBtn = article.querySelector("[data-gpt-boost-collapse-btn]");
    if (!(collapseBtn instanceof HTMLElement) && article.isConnected) {
      injectArticleUi(article, virtualId);
      collapseBtn = article.querySelector("[data-gpt-boost-collapse-btn]");
    }
    if (!(collapseBtn instanceof HTMLElement)) return;
    styleInlineActionButton(collapseBtn, 'collapse', state.collapsedMessages.has(virtualId), deps.getThemeTokens());
  }

  function applyCollapseState(article, virtualId) {
    const isCollapsed = state.collapsedMessages.has(virtualId);
    const contentArea = article.querySelector("[data-message-author-role]");
    const snippet = article.querySelector("[data-gpt-boost-snippet]");
    const collapseBtn = article.querySelector("[data-gpt-boost-collapse-btn]");

    if (contentArea) {
      contentArea.style.display = isCollapsed ? "none" : "";
    }
    if (snippet) {
      snippet.style.display = isCollapsed ? "block" : "none";
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
    let pinBtn = article.querySelector("[data-gpt-boost-pin-btn]");
    if (!(pinBtn instanceof HTMLElement) && article.isConnected) {
      injectArticleUi(article, virtualId);
      pinBtn = article.querySelector("[data-gpt-boost-pin-btn]");
    }
    if (!pinBtn) return;
    const isPinned = state.pinnedMessages.has(virtualId);
    styleInlineActionButton(pinBtn, 'pin', isPinned, deps.getThemeTokens());
    pinBtn.setAttribute("aria-label", isPinned ? "Unpin message" : "Pin message to top");
  }

  function updateBookmarkButtonAppearance(article, virtualId) {
    let bookmarkBtn = article.querySelector("[data-gpt-boost-bookmark-btn]");
    if (!(bookmarkBtn instanceof HTMLElement) && article.isConnected) {
      injectArticleUi(article, virtualId);
      bookmarkBtn = article.querySelector("[data-gpt-boost-bookmark-btn]");
    }
    if (!bookmarkBtn) return;
    const isBookmarked = state.bookmarkedMessages.has(virtualId);
    styleInlineActionButton(bookmarkBtn, 'bookmark', isBookmarked, deps.getThemeTokens());
    bookmarkBtn.setAttribute("aria-label", isBookmarked ? "Remove bookmark" : "Bookmark message");
  }

  function applyTheme(theme = deps.getThemeTokens()) {
    document.querySelectorAll("[data-gpt-boost-ui-injected='1']").forEach((article) => {
      if (!(article instanceof HTMLElement)) return;
      const virtualId = article.dataset.virtualId || "";
      const snippet = article.querySelector("[data-gpt-boost-snippet]");
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
    const alreadyInjected = !!article.dataset.gptBoostUiInjected;
    if (!alreadyInjected) {
      article.dataset.gptBoostUiInjected = "1";
    }

    article.style.transition = "box-shadow 0.15s ease";
    const hoverTarget = getArticleHoverTarget(article);

    const getCurrentVirtualId = () => String(article.dataset.virtualId || virtualId || "");

    const theme = deps.getThemeTokens();
    const host = ensureInlineActionsHost(article);
    if (!host) {
      setTimeout(() => {
        if (!article.isConnected) return;
        if (article.querySelector("[data-gpt-boost-inline-actions]")) return;
        injectArticleUi(article, virtualId);
      }, 200);
      return;
    }

    if (article.querySelector("[data-gpt-boost-collapse-btn]")) {
      const currentId = getCurrentVirtualId();
      updateCollapseButtonAppearance(article, currentId);
      updatePinButtonAppearance(article, currentId);
      updateBookmarkButtonAppearance(article, currentId);
      applyCollapseState(article, currentId);
      return;
    }

    const collapseBtn = createArticleActionButton("collapse", "Collapse message", theme);
    collapseBtn.setAttribute("data-gpt-boost-collapse-btn", "1");
    styleInlineActionButton(collapseBtn, "collapse", false, theme);
    collapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const currentId = getCurrentVirtualId();
      if (!currentId) return;
      toggleCollapse(currentId);
    });

    const pinBtn = createArticleActionButton("pin", "Pin message to top", theme);
    pinBtn.setAttribute("data-gpt-boost-pin-btn", "1");
    styleInlineActionButton(pinBtn, "pin", false, theme);
    pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const currentId = getCurrentVirtualId();
      if (!currentId) return;
      deps.togglePin(currentId);
      updatePinButtonAppearance(article, currentId);
    });

    const bookmarkBtn = createArticleActionButton("bookmark", "Bookmark message", theme);
    bookmarkBtn.setAttribute("data-gpt-boost-bookmark-btn", "1");
    styleInlineActionButton(bookmarkBtn, "bookmark", false, theme);
    bookmarkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const currentId = getCurrentVirtualId();
      if (!currentId) return;
      deps.toggleBookmark(currentId);
      updateBookmarkButtonAppearance(article, currentId);
    });

    host.appendChild(collapseBtn);
    host.appendChild(pinBtn);
    host.appendChild(bookmarkBtn);

    if (!article.dataset.gptBoostHoverBound) {
      article.addEventListener("mouseenter", () => {
        const currentId = getCurrentVirtualId();
        if (currentId && !article.querySelector("[data-gpt-boost-inline-actions]")) {
          injectArticleUi(article, currentId);
        }
        if (hoverTarget instanceof HTMLElement) {
          hoverTarget.style.boxShadow = constants.articleHoverHighlightShadow;
          hoverTarget.style.borderRadius = "12px";
          hoverTarget.style.outline = "1px solid rgba(59,130,246,0.1)";
          hoverTarget.style.outlineOffset = "3px";
        }
      });
      article.addEventListener("mouseleave", () => {
        if (hoverTarget instanceof HTMLElement) {
          hoverTarget.style.boxShadow = "";
          hoverTarget.style.borderRadius = "";
          hoverTarget.style.outline = "";
          hoverTarget.style.outlineOffset = "";
        }
      });
      article.dataset.gptBoostHoverBound = "1";
    }

    let snippet = article.querySelector("[data-gpt-boost-snippet]");
    if (!(snippet instanceof HTMLElement)) {
      snippet = document.createElement("div");
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
    const currentId = getCurrentVirtualId();
    if (currentId) {
      applyCollapseState(article, currentId);
      updatePinButtonAppearance(article, currentId);
      updateBookmarkButtonAppearance(article, currentId);
    }
    applyTheme(theme);
  }

  function cleanupInjectedUi() {
    document.querySelectorAll("[data-gpt-boost-ui-injected]").forEach((el) => {
      el.removeAttribute("data-gpt-boost-ui-injected");
      const overlay = el.querySelector("[data-gpt-boost-overlay]");
      if (overlay) overlay.remove();
      const sideRail = el.querySelector("[data-gpt-boost-side-rail]");
      if (sideRail) sideRail.remove();
      const inlineActions = el.querySelector("[data-gpt-boost-inline-actions]");
      if (inlineActions) inlineActions.remove();
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
          const hoverOverlay = hoverTarget.querySelector("[data-gpt-boost-overlay]");
          if (hoverOverlay) hoverOverlay.remove();
        }
        delete el.dataset.gptBoostHoverBound;
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
