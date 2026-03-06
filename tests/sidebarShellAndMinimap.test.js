import { createSidebarShellFeature } from '../src/ui/features/sidebar/shellFeature.js';
import { createMinimapFeature } from '../src/ui/features/minimap/minimapFeature.js';

describe('sidebar shell tab layout', () => {
  it('renders full-width tabs without the broken outline/map tab and keeps settings in header actions', () => {
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
    expect(tabIds).toEqual(['search', 'bookmarks', 'snippets']);
    expect(tabIds).not.toContain('settings');
    tabButtons.forEach((button) => {
      expect(button.style.flexGrow).toBe('1');
      expect(button.style.minWidth).toBe('0');
    });

    expect(document.querySelector('button[aria-label="Open sidebar settings"]')).not.toBeNull();
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
