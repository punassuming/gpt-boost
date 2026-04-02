import { createSidebarShellFeature } from '../src/ui/features/sidebar/shellFeature.js';
import { createMinimapFeature } from '../src/ui/features/minimap/minimapFeature.js';
import { buildMinimapItems } from '../src/ui/features/minimap/minimapModel.js';

describe('sidebar shell tab layout', () => {
  it('renders first-class workspace tabs with labeled sections', () => {
    document.body.innerHTML = '';
    const refs = {
      sidebarPanel: null,
      sidebarContentContainer: null,
      sidebarToggleButton: null,
      activeSidebarTab: 'search',
      currentSidebarWidthPx: 320,
      hotkeyListenerBound: false
    };
    const constants = {
      sidebarTransitionMs: 120,
      minSidebarWidthPx: 280,
      minViewportGapPx: 360,
      sidebarToggleRightOffsetPx: 12,
      sidebarToggleTopOffsetPx: 12,
      sidebarToggleSizePx: 32
    };
    const deps = {
      getThemeTokens: () => ({
        panelBg: '#111',
        panelBorder: '#333',
        panelShadow: '0 2px 4px rgba(0,0,0,0.2)',
        text: '#fff',
        mutedText: '#bbb',
        inputBg: '#222',
        buttonMutedBg: '#2a2a2a'
      }),
      getSidebarStatsSummary: () => '1/1',
      getSidebarVersionLabel: () => 'v1',
      styleSearchButton: () => {},
      renderSidebarTabContent: () => {},
      onMapTabActivated: () => {},
      applySidebarLayoutOffset: () => {},
      applyFloatingUiOffsets: () => {},
      refreshArticleSideRailLayout: () => {},
      clearSearchHighlight: () => {},
      hideSearchPanel: () => {},
      applyThemeToUi: () => {},
      isEnabled: () => true,
      hotkeyMatchesKeyboardEvent: () => false
    };

    const feature = createSidebarShellFeature({ refs, constants, deps });
    feature.ensureSidebarPanel();

    const tabButtons = Array.from(document.querySelectorAll('[data-gpt-boost-sidebar-tab]'));
    const tabIds = tabButtons.map((el) => el.dataset.gptBoostSidebarTab);
    expect(tabIds).toEqual(['memory', 'search', 'marks', 'inspector', 'snippets', 'settings']);
    tabButtons.forEach((button) => {
      expect(button.style.width).toBe('100%');
      expect(button.style.minWidth).toBe('0');
    });

    expect(document.querySelector('[data-gpt-boost-sidebar-header="1"]')).not.toBeNull();
    expect(document.querySelector('[data-gpt-boost-sidebar-context="1"]').textContent).toBe('Search');
  });
});

describe('minimap edge feathering', () => {
  it('applies stronger edge feather masks and negative right margin without hard border', () => {
    document.body.innerHTML = '';
    const refs = {
      minimapPanel: null,
      minimapButton: null,
      activeStandaloneMinimapVirtualId: null
    };
    const feature = createMinimapFeature({
      refs,
      state: { articleMap: new Map() },
      constants: {
        minimapPanelTopOffsetPx: 100,
        minimapPanelRightOffsetPx: 20,
        minimapPanelWidthPx: 34,
        minimapPanelNegativeMarginRightPx: -16,
        minimapTrackHeightPx: 200,
        scrollButtonSizePx: 32,
        minimapButtonGapPx: 10
      },
      getUiSettings: () => ({
        userColorDark: '#303030',
        userColorLight: '#f4f4f4',
        assistantColorDark: '#202020',
        assistantColorLight: '#ffffff',
        minimapVisible: true
      }),
      deps: {
        ensureVirtualIds: () => {},
        getMessageRole: () => 'assistant',
        getCodeSnippetVirtualIds: () => new Set(),
        getSearchHitVirtualIds: () => new Set(),
        getThemeTokens: () => ({ panelBorder: '#444', text: '#fff' }),
        getThemeMode: () => 'dark',
        getScrollTarget: () => null,
        getMaxScrollTop: () => 0,
        getViewportAnchorVirtualId: () => null,
        escapeSelectorValue: (value) => value,
        scrollToVirtualId: () => {},
        applyFloatingUiOffsets: () => {},
        applyThemeToUi: () => {}
      }
    });

    const panel = feature.ensureMinimapPanel();
    feature.applyTheme({ panelBorder: '#444', text: '#fff' });
    const track = panel.querySelector('[data-chatgpt-minimap="track"]');

    expect(panel.style.border).toBe('');
    expect(panel.style.marginRight).toBe('-16px');
    expect(panel.style.maskImage).toContain('radial-gradient');
    expect(panel.style.maskImage).toContain('160% 128%');
    expect(track.style.maskImage).toContain('radial-gradient');
  });
});

describe('minimap viewport drag behavior', () => {
  it('allows click-on-track and continued drag in one gesture', () => {
    document.body.innerHTML = '';
    const scrollTarget = {
      clientHeight: 200,
      scrollHeight: 1200,
      scrollTop: 0,
      scrollTo: jest.fn()
    };
    const refs = {
      minimapPanel: null,
      minimapButton: null,
      activeStandaloneMinimapVirtualId: null
    };
    const feature = createMinimapFeature({
      refs,
      state: { articleMap: new Map() },
      constants: {
        minimapPanelTopOffsetPx: 100,
        minimapPanelRightOffsetPx: 20,
        minimapPanelWidthPx: 18,
        minimapTrackHeightPx: 200,
        scrollButtonSizePx: 32,
        minimapButtonGapPx: 10
      },
      getUiSettings: () => ({
        userColorDark: '#303030',
        userColorLight: '#f4f4f4',
        assistantColorDark: '#202020',
        assistantColorLight: '#ffffff',
        minimapVisible: true
      }),
      deps: {
        ensureVirtualIds: () => {},
        getMessageRole: () => 'assistant',
        getCodeSnippetVirtualIds: () => new Set(),
        getSearchHitVirtualIds: () => new Set(),
        getThemeTokens: () => ({ panelBorder: '#444', text: '#fff' }),
        getThemeMode: () => 'dark',
        getScrollTarget: () => scrollTarget,
        getMaxScrollTop: () => 1000,
        getViewportAnchorVirtualId: () => null,
        escapeSelectorValue: (value) => value,
        scrollToVirtualId: () => {},
        applyFloatingUiOffsets: () => {},
        applyThemeToUi: () => {}
      }
    });

    const panel = feature.ensureMinimapPanel();
    const track = panel.querySelector('[data-chatgpt-minimap="track"]');
    const viewport = panel.querySelector('[data-chatgpt-minimap="viewport"]');

    track.getBoundingClientRect = () => ({ top: 100, height: 200 });
    viewport.getBoundingClientRect = () => ({ top: 160, height: 24 });

    track.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientY: 180 }));
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 250 }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(scrollTarget.scrollTo).toHaveBeenCalledTimes(2);
    const firstTop = scrollTarget.scrollTo.mock.calls[0][0].top;
    const secondTop = scrollTarget.scrollTo.mock.calls[1][0].top;
    expect(secondTop).toBeGreaterThan(firstTop);
  });
});

describe('minimap content overlays', () => {
  it('renders text silhouette lines with search and code markers', () => {
    document.body.innerHTML = '';
    const article = document.createElement('article');
    article.dataset.virtualId = '1';
    article.innerHTML = '<div data-message-author-role="assistant">This is a longer message that should produce a text silhouette.</div>';
    const refs = {
      minimapPanel: null,
      minimapButton: null,
      activeStandaloneMinimapVirtualId: null
    };
    const feature = createMinimapFeature({
      refs,
      state: { articleMap: new Map([['1', article]]) },
      constants: {
        minimapPanelTopOffsetPx: 100,
        minimapPanelRightOffsetPx: 20,
        minimapPanelWidthPx: 24,
        minimapTrackHeightPx: 200,
        scrollButtonSizePx: 32,
        minimapButtonGapPx: 10
      },
      getUiSettings: () => ({
        userColorDark: '#303030',
        userColorLight: '#f4f4f4',
        assistantColorDark: '#202020',
        assistantColorLight: '#ffffff',
        minimapVisible: true
      }),
      deps: {
        ensureVirtualIds: () => {},
        getMessageRole: () => 'assistant',
        getCodeSnippetVirtualIds: () => new Set(['1']),
        getSearchHitVirtualIds: () => new Set(['1']),
        getThemeTokens: () => ({ panelBorder: '#444', text: '#fff' }),
        getThemeMode: () => 'dark',
        getScrollTarget: () => null,
        getMaxScrollTop: () => 0,
        getViewportAnchorVirtualId: () => null,
        escapeSelectorValue: (value) => value,
        scrollToVirtualId: () => {},
        applyFloatingUiOffsets: () => {},
        applyThemeToUi: () => {}
      }
    });

    const panel = feature.ensureMinimapPanel();
    const track = panel.querySelector('[data-chatgpt-minimap="track"]');
    Object.defineProperty(track, 'clientHeight', { value: 200, configurable: true });
    feature.populateMinimapPanel(panel);

    expect(panel.querySelectorAll('[data-gpt-boost-minimap-line="1"]').length).toBeGreaterThan(0);
    expect(panel.querySelector('[data-gpt-boost-minimap-overlay="1"][data-overlay-type="search"]')).not.toBeNull();
    expect(panel.querySelector('[data-gpt-boost-minimap-overlay="1"][data-overlay-type="code"]')).not.toBeNull();
  });

  it('updates overlay signals without replacing marker nodes', () => {
    document.body.innerHTML = '';
    const article = document.createElement('article');
    article.dataset.virtualId = '1';
    article.innerHTML = '<div data-message-author-role="assistant">Message body</div>';
    const refs = {
      minimapPanel: null,
      minimapButton: null,
      activeStandaloneMinimapVirtualId: null
    };
    let searchHitIds = new Set();
    let codeSnippetIds = new Set();
    const feature = createMinimapFeature({
      refs,
      state: { articleMap: new Map([['1', article]]) },
      constants: {
        minimapPanelTopOffsetPx: 100,
        minimapPanelRightOffsetPx: 20,
        minimapPanelWidthPx: 24,
        minimapTrackHeightPx: 200,
        scrollButtonSizePx: 32,
        minimapButtonGapPx: 10
      },
      getUiSettings: () => ({ minimapVisible: true }),
      deps: {
        ensureVirtualIds: () => {},
        getMessageRole: () => 'assistant',
        getCodeSnippetVirtualIds: () => codeSnippetIds,
        getSearchHitVirtualIds: () => searchHitIds,
        getThemeTokens: () => ({ panelBorder: '#444', text: '#fff' }),
        getThemeMode: () => 'dark',
        getScrollTarget: () => null,
        getMaxScrollTop: () => 0,
        getViewportAnchorVirtualId: () => null,
        escapeSelectorValue: (value) => value,
        scrollToVirtualId: () => {},
        applyFloatingUiOffsets: () => {},
        applyThemeToUi: () => {}
      }
    });

    const panel = feature.ensureMinimapPanel();
    panel.style.display = 'block';
    const track = panel.querySelector('[data-chatgpt-minimap="track"]');
    Object.defineProperty(track, 'clientHeight', { value: 200, configurable: true });
    feature.populateMinimapPanel(panel);

    const markerBefore = panel.querySelector('[data-gpt-boost-minimap-marker="1"]');
    expect(markerBefore).not.toBeNull();
    expect(panel.querySelector('[data-gpt-boost-minimap-overlay="1"]')).toBeNull();

    searchHitIds = new Set(['1']);
    codeSnippetIds = new Set(['1']);
    feature.refreshMinimapSignals();

    const markerAfter = panel.querySelector('[data-gpt-boost-minimap-marker="1"]');
    expect(markerAfter).toBe(markerBefore);
    expect(panel.querySelector('[data-gpt-boost-minimap-overlay="1"][data-overlay-type="search"]')).not.toBeNull();
    expect(panel.querySelector('[data-gpt-boost-minimap-overlay="1"][data-overlay-type="code"]')).not.toBeNull();
  });
});

describe('minimap model caching', () => {
  it('reuses cached silhouette data when message content is unchanged', () => {
    const article = document.createElement('article');
    article.dataset.virtualId = '1';
    article.innerHTML = '<div data-message-author-role="assistant">A message with enough text to produce multiple minimap lines.</div>';
    Object.defineProperty(article, 'offsetHeight', { value: 180, configurable: true });

    const cache = new Map();
    const params = {
      ensureVirtualIds: () => {},
      articleMap: new Map([['1', article]]),
      getMessageRole: () => 'assistant',
      getCodeSnippetVirtualIds: () => new Set(),
      getSearchHitVirtualIds: () => new Set(),
      cache
    };

    const first = buildMinimapItems(params);
    const second = buildMinimapItems(params);

    expect(first[0].lineRatios).toBe(second[0].lineRatios);
    expect(cache.get('1').lineRatios).toBe(first[0].lineRatios);
  });
});
