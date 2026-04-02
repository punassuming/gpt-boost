import { createArticleActionsFeature } from '../src/ui/features/articleActions/articleActionsFeature.js';

describe('article actions', () => {
  it('keeps pin and bookmark controls visible without hover and themes them', () => {
    document.body.innerHTML = '';
    const article = document.createElement('article');
    article.dataset.virtualId = '1';
    article.innerHTML = '<div data-message-author-role="assistant">Example message</div>';
    document.body.appendChild(article);

    const feature = createArticleActionsFeature({
      state: {
        articleMap: new Map([['1', article]]),
        collapsedMessages: new Set(),
        pinnedMessages: new Set(),
        bookmarkedMessages: new Set()
      },
      constants: {
        articleSnippetLength: 100,
        articleHoverHighlightShadow: '0 0 0 1px rgba(59,130,246,0.18)',
        messageRailOutsideLeftPx: -36,
        messageRailInsideLeftPx: 6,
        messageRailInsidePaddingPx: 34,
        messageHoverExtraPaddingPx: 14
      },
      deps: {
        togglePin: jest.fn(),
        toggleBookmark: jest.fn(),
        refreshSidebarTab: jest.fn(),
        getThemeTokens: () => ({
          panelBg: '#111',
          panelBorder: '#333',
          panelShadow: '0 2px 4px rgba(0,0,0,0.2)',
          inputBg: '#222',
          inputBorder: '#444',
          text: '#fff',
          mutedText: '#bbb',
          buttonMutedBg: '#2a2a2a',
          buttonText: '#fff'
        })
      }
    });

    feature.injectArticleUi(article, '1');

    const sideRail = article.querySelector('[data-gpt-boost-side-rail="1"]');
    const pinBtn = article.querySelector('[data-gpt-boost-pin-btn="1"]');
    const bookmarkBtn = article.querySelector('[data-gpt-boost-bookmark-btn="1"]');

    expect(sideRail).not.toBeNull();
    expect(sideRail.style.opacity).toBe('1');
    expect(sideRail.style.pointerEvents).toBe('auto');
    expect(pinBtn).not.toBeNull();
    expect(bookmarkBtn).not.toBeNull();
    expect(pinBtn.style.background).toBeTruthy();
    expect(bookmarkBtn.style.border).toContain('1px solid');
  });
});
