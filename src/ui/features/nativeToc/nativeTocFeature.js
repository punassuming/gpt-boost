const TOC_BUTTON_SELECTOR = 'button[aria-label^="Prompt "]';

export function createNativeTocFeature({ state, deps }) {
  let tocObserver = null;
  // button element → tooltip div
  const tipsByButton = new Map();

  function findToc() {
    const btn = document.querySelector(TOC_BUTTON_SELECTOR);
    return btn ? btn.closest('div') : null;
  }

  function getUserArticlesInOrder() {
    return [...state.articleMap.entries()]
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, article]) => article)
      .filter((article) => deps.getMessageRole(article) === 'user');
  }

  function getArticlePreview(article) {
    if (!(article instanceof HTMLElement)) return '';
    const raw = article.dataset.gptBoostCachedText ||
      (article.querySelector('[data-message-author-role]') || article).textContent ||
      '';
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    return trimmed.length > 120 ? trimmed.slice(0, 120) + '…' : trimmed;
  }

  function applyTooltipTheme(tip) {
    const isDark = deps.getThemeMode() === 'dark';
    tip.style.background = isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.98)';
    tip.style.color = isDark ? '#e2e8f0' : '#1e293b';
    tip.style.boxShadow = isDark
      ? '0 4px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)'
      : '0 4px 20px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.10)';
  }

  function createTooltip(preview) {
    const tip = document.createElement('div');
    tip.setAttribute('data-gpt-boost-toc-tip', '1');
    tip.style.position = 'fixed';
    tip.style.zIndex = '10010';
    tip.style.maxWidth = '220px';
    tip.style.padding = '5px 9px';
    tip.style.borderRadius = '7px';
    tip.style.fontSize = '11px';
    tip.style.lineHeight = '1.5';
    tip.style.pointerEvents = 'none';
    tip.style.opacity = '0';
    tip.style.transition = 'opacity 120ms ease';
    tip.style.wordBreak = 'break-word';
    tip.textContent = preview;
    applyTooltipTheme(tip);
    document.body.appendChild(tip);
    return tip;
  }

  function positionTooltip(tip, button) {
    const rect = button.getBoundingClientRect();
    // Anchor to the left edge of the TOC button with an 8px gap
    const rightEdge = window.innerWidth - rect.left + 8;
    tip.style.right = `${rightEdge}px`;
    tip.style.left = 'auto';

    const tipH = tip.offsetHeight || 28;
    const top = Math.min(
      window.innerHeight - tipH - 8,
      Math.max(8, rect.top + rect.height / 2 - tipH / 2)
    );
    tip.style.top = `${top}px`;
  }

  function enhanceTocButtons(toc) {
    const userArticles = getUserArticlesInOrder();
    const buttons = Array.from(toc.querySelectorAll(TOC_BUTTON_SELECTOR));

    buttons.forEach((btn, i) => {
      if (tipsByButton.has(btn)) return;

      const preview = getArticlePreview(userArticles[i]);
      if (!preview) return;

      const tip = createTooltip(preview);
      tipsByButton.set(btn, tip);

      btn.addEventListener('mouseenter', () => {
        positionTooltip(tip, btn);
        tip.style.opacity = '1';
      });
      btn.addEventListener('mouseleave', () => {
        tip.style.opacity = '0';
      });
    });
  }

  function tryEnhance() {
    const toc = findToc();
    if (!toc) return;

    enhanceTocButtons(toc);

    if (!tocObserver) {
      tocObserver = new MutationObserver(() => enhanceTocButtons(toc));
      tocObserver.observe(toc, { childList: true });
    }
  }

  function teardown() {
    if (tocObserver) {
      tocObserver.disconnect();
      tocObserver = null;
    }
    tipsByButton.forEach((tip) => tip.remove());
    tipsByButton.clear();
  }

  return {
    id: 'native-toc-enhancer',
    priority: 85,
    onBoot: () => tryEnhance(),
    onVirtualizeTick: () => tryEnhance(),
    onThemeChanged: () => {
      tipsByButton.forEach((tip) => applyTooltipTheme(tip));
    },
    onTeardown: () => teardown()
  };
}
