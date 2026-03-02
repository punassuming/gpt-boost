export interface LifecycleManagerDeps {
  log: (...args: unknown[]) => void;
  hasAnyMessages: () => boolean;
  findScrollContainer: () => HTMLElement | Window | null;
  setupScrollTracking: (
    scrollContainer: HTMLElement | Window,
    throttleMs: number,
    onScrollChange: () => void
  ) => () => void;
  scheduleVirtualization: () => void;
  updateMapViewportState: () => void;
  updateStandaloneMinimapViewportState: () => void;
  isSidebarOpen: () => boolean;
  getCurrentSidebarWidthPx: () => number;
  applySidebarLayoutOffset: (offsetPx: number) => void;
  applyFloatingUiOffsets: () => void;
  refreshArticleSideRailLayout: () => void;
  applyThemeToUi: () => void;
  bindSidebarHotkey: () => void;
  applyRoleColorSettings: () => void;
  applyConversationLayoutSettings: () => void;
  findConversationRoot: () => HTMLElement;
  createDebouncedObserver: (onMutation: () => void, delayMs: number) => MutationObserver;
  setCurrentConversationKey: (key: string) => void;
  getConversationStorageKey: () => string;
  loadPersistedFlagsForConversation: (
    onLoaded: () => void
  ) => Promise<unknown>;
  syncFlagsFromPersistedKeys: () => void;
  dispatchBoot: () => void;
  dispatchTeardown: () => void;
  virtualizeNow: () => void;
  clearDeferredVirtualizationTimer: () => void;
  cleanupUiState: () => void;
  getActiveSidebarTab: () => string;
  openSidebar: (tabId?: string) => void;
}

export interface LifecycleManagerOptions {
  state: any;
  config: any;
  deps: LifecycleManagerDeps;
}

const DEFAULT_SCROLL_THROTTLE_MS = 50;
const DEFAULT_MUTATION_DEBOUNCE_MS = 50;
const DEFAULT_URL_CHECK_INTERVAL_MS = 1000;

export function createLifecycleManager({
  state,
  config,
  deps
}: LifecycleManagerOptions) {
  let themeObserver: MutationObserver | null = null;
  let urlWatcherInterval: ReturnType<typeof setInterval> | null = null;
  let bootWarmupTimers: Array<ReturnType<typeof setTimeout>> = [];

  function getScrollThrottleMs(): number {
    const value = Number(config.SCROLL_THROTTLE_MS);
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : DEFAULT_SCROLL_THROTTLE_MS;
  }

  function getMutationDebounceMs(): number {
    const value = Number(config.MUTATION_DEBOUNCE_MS);
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : DEFAULT_MUTATION_DEBOUNCE_MS;
  }

  function getUrlCheckIntervalMs(): number {
    const value = Number(config.URL_CHECK_INTERVAL);
    return Number.isFinite(value) ? Math.max(50, Math.round(value)) : DEFAULT_URL_CHECK_INTERVAL_MS;
  }

  function attachOrUpdateScrollListener() {
    if (!deps.hasAnyMessages()) return;

    const container = deps.findScrollContainer();
    if (!container) return;

    if (container === state.scrollElement && state.cleanupScrollListener) {
      return;
    }

    if (state.cleanupScrollListener) {
      state.cleanupScrollListener();
      state.cleanupScrollListener = null;
    }

    state.scrollElement = container;
    state.cleanupScrollListener = deps.setupScrollTracking(
      container,
      getScrollThrottleMs(),
      () => {
        deps.scheduleVirtualization();
        deps.updateMapViewportState();
        deps.updateStandaloneMinimapViewportState();
      }
    );

    if (deps.isSidebarOpen()) {
      deps.applySidebarLayoutOffset(deps.getCurrentSidebarWidthPx());
      deps.applyFloatingUiOffsets();
    }

    deps.log(
      "Scroll listener attached to:",
      container === window
        ? "window"
        : `${container.tagName} ${container.className || ""}`
    );
  }

  function handleResize() {
    attachOrUpdateScrollListener();
    deps.refreshArticleSideRailLayout();
    deps.scheduleVirtualization();
  }

  function ensureThemeObserver() {
    if (themeObserver) return;
    themeObserver = new MutationObserver(() => deps.applyThemeToUi());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  function clearBootWarmupTimers() {
    bootWarmupTimers.forEach((timerId) => clearTimeout(timerId));
    bootWarmupTimers = [];
  }

  function bootVirtualizer() {
    deps.log("bootVirtualizer called", { lifecycle: state.lifecycleStatus });
    if (state.lifecycleStatus !== "IDLE") {
      deps.log("bootVirtualizer: already active, aborting");
      return;
    }

    ensureThemeObserver();
    deps.bindSidebarHotkey();
    deps.applyRoleColorSettings();
    deps.applyConversationLayoutSettings();

    const root = deps.findConversationRoot();
    state.conversationRoot = root;

    const mutationObserver = deps.createDebouncedObserver(() => {
      attachOrUpdateScrollListener();
      deps.scheduleVirtualization();
    }, getMutationDebounceMs());
    mutationObserver.observe(root, {
      childList: true,
      subtree: true
    });

    const bodyObserver = deps.createDebouncedObserver(() => {
      const newRoot = deps.findConversationRoot();
      if (newRoot !== state.conversationRoot) {
        state.conversationRoot = newRoot;
        mutationObserver.disconnect();
        mutationObserver.observe(newRoot, { childList: true, subtree: true });
      }
      attachOrUpdateScrollListener();
      deps.scheduleVirtualization();
    }, getMutationDebounceMs());
    if (document.body) {
      bodyObserver.observe(document.body, { childList: true, subtree: false });
    }
    state.bodyObserver = bodyObserver;

    state.lifecycleStatus = "OBSERVING";
    state.observer = mutationObserver;

    deps.log("Virtualizer booted.");
    deps.setCurrentConversationKey(deps.getConversationStorageKey());

    attachOrUpdateScrollListener();
    deps.scheduleVirtualization();

    const warmupNow = (delayMs: number) => {
      const timerId = setTimeout(() => {
        attachOrUpdateScrollListener();
        deps.virtualizeNow();
      }, delayMs);
      bootWarmupTimers.push(timerId);
    };
    warmupNow(0);
    warmupNow(250);

    deps.loadPersistedFlagsForConversation(deps.syncFlagsFromPersistedKeys).catch(() => { });
    deps.dispatchBoot();
  }

  function teardownVirtualizer() {
    deps.dispatchTeardown();
    deps.applySidebarLayoutOffset(0);

    if (state.observer) state.observer.disconnect();
    if (state.bodyObserver) {
      state.bodyObserver.disconnect();
      state.bodyObserver = null;
    }
    if (state.cleanupScrollListener) state.cleanupScrollListener();
    deps.clearDeferredVirtualizationTimer();
    clearBootWarmupTimers();

    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }

    state.scrollElement = null;
    state.cleanupScrollListener = null;
    state.observer = null;
    state.conversationRoot = null;
    state.lifecycleStatus = "IDLE";
    state.requestAnimationScheduled = false;

    deps.cleanupUiState();
  }

  function startUrlWatcher() {
    if (urlWatcherInterval !== null) return;

    urlWatcherInterval = setInterval(() => {
      if (window.location.href !== state.lastUrl) {
        state.lastUrl = window.location.href;
        deps.log("URL changed → rebooting virtualizer");
        const wasSidebarOpen = deps.isSidebarOpen();
        const previousSidebarTab = deps.getActiveSidebarTab();
        teardownVirtualizer();
        bootVirtualizer();
        if (wasSidebarOpen) {
          deps.openSidebar(previousSidebarTab);
        }
      }
    }, getUrlCheckIntervalMs());
  }

  function stopUrlWatcher() {
    if (urlWatcherInterval === null) return;
    clearInterval(urlWatcherInterval);
    urlWatcherInterval = null;
  }

  return {
    attachOrUpdateScrollListener,
    handleResize,
    bootVirtualizer,
    teardownVirtualizer,
    startUrlWatcher,
    stopUrlWatcher
  };
}
