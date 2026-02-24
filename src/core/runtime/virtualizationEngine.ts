export interface VirtualizationEngineDeps {
  log: (...args: unknown[]) => void;
  attachOrUpdateScrollListener: () => void;
  ensureVirtualIds: () => void;
  getActiveConversationNodes: () => Element[];
  getViewportMetrics: () => { top: number; height: number };
  isVirtualSpacerNode: (node: Element | null | undefined) => boolean;
  queueDeferredVirtualizationRetry: () => void;
  updateIndicator: (totalMessages: number, renderedMessages: number) => void;
  hideAllUiElements: () => void;
  updateMapViewportState: () => void;
  updateStandaloneMinimapViewportState: () => void;
  refreshSidebarTab: () => void;
  populateMinimapPanel: (panel: HTMLElement) => void;
  getMinimapPanel: () => HTMLElement | null;
  dispatchStatsUpdated: () => void;
  dispatchVirtualizeTick: () => void;
}

export interface VirtualizationEngineOptions {
  state: any;
  config: any;
  deps: VirtualizationEngineDeps;
}

export function createVirtualizationEngine({
  state,
  config,
  deps
}: VirtualizationEngineOptions) {
  function convertArticleToSpacer(articleElement: HTMLElement) {
    const id = articleElement.dataset.virtualId;
    if (!id || !articleElement.isConnected) return;

    const rect = articleElement.getBoundingClientRect();
    const height = rect.height || 24;

    const spacer = document.createElement("div");
    spacer.dataset.chatgptVirtualSpacer = "1";
    spacer.dataset.virtualId = id;
    spacer.style.height = `${height}px`;
    spacer.style.pointerEvents = "none";
    spacer.style.opacity = "0";

    articleElement.replaceWith(spacer);
    state.articleMap.set(id, articleElement);
  }

  function convertSpacerToArticle(spacerElement: HTMLElement) {
    const id = spacerElement.dataset.virtualId;
    if (!id) return;

    const original = state.articleMap.get(id);
    if (!original || original.isConnected) return;

    spacerElement.replaceWith(original);
  }

  function updateStats() {
    const activeNodes = deps.getActiveConversationNodes();
    const spacers = document.querySelectorAll('div[data-chatgpt-virtual-spacer="1"]');
    const nodes = [...activeNodes, ...spacers];

    let total = 0;
    let rendered = 0;

    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (!node.dataset.virtualId) return;

      total += 1;
      if (!deps.isVirtualSpacerNode(node)) rendered += 1;
    });

    const isTotalChanged = state.stats.totalMessages !== total;

    state.stats.totalMessages = total;
    state.stats.renderedMessages = rendered;
    deps.updateIndicator(total, rendered);

    if (isTotalChanged) {
      deps.refreshSidebarTab();
      const minimapPanel = deps.getMinimapPanel();
      if (minimapPanel && minimapPanel.style.display !== "none") {
        deps.populateMinimapPanel(minimapPanel);
      }
    }
    deps.updateMapViewportState();
    deps.updateStandaloneMinimapViewportState();
    deps.dispatchStatsUpdated();
  }

  function virtualizeNow() {
    deps.log("virtualizeNow", { enabled: state.enabled, lifecycle: state.lifecycleStatus });
    if (!state.enabled) {
      deps.hideAllUiElements();
      return;
    }

    if (!state.scrollElement) {
      deps.attachOrUpdateScrollListener();
    }

    deps.ensureVirtualIds();

    const activeNodes = deps.getActiveConversationNodes();
    const spacers = document.querySelectorAll('div[data-chatgpt-virtual-spacer="1"]');
    const nodes = [...activeNodes, ...spacers];
    if (!nodes.length) {
      deps.log("virtualize: no messages yet");
      deps.updateIndicator(0, 0);
      deps.queueDeferredVirtualizationRetry();
      return;
    }

    const viewport = deps.getViewportMetrics();
    if (viewport.height <= 0) {
      deps.log("virtualize: skipped due to unavailable viewport height");
      deps.queueDeferredVirtualizationRetry();
      return;
    }
    state.emptyVirtualizationRetryCount = 0;

    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;

      const rect = node.getBoundingClientRect();
      const relativeTop = rect.top - viewport.top;
      const relativeBottom = rect.bottom - viewport.top;

      const isOutside =
        relativeBottom < -config.MARGIN_PX ||
        relativeTop > viewport.height + config.MARGIN_PX;

      if (deps.isVirtualSpacerNode(node)) {
        if (!isOutside) convertSpacerToArticle(node);
      } else if (isOutside) {
        convertArticleToSpacer(node);
      }
    });

    updateStats();
    deps.dispatchVirtualizeTick();
    deps.log(
      `virtualize: total=${state.stats.totalMessages}, rendered=${state.stats.renderedMessages}`
    );
  }

  function scheduleVirtualization() {
    if (state.requestAnimationScheduled) return;
    state.requestAnimationScheduled = true;
    deps.log("scheduleVirtualization: queuing rAF");
    requestAnimationFrame(() => {
      state.requestAnimationScheduled = false;
      virtualizeNow();
    });
  }

  function getStatsSnapshot() {
    const { totalMessages, renderedMessages } = state.stats;
    const saved =
      totalMessages > 0
        ? Math.round((1 - renderedMessages / totalMessages) * 100)
        : 0;

    return {
      totalMessages,
      renderedMessages,
      memorySavedPercent: saved
    };
  }

  return {
    convertArticleToSpacer,
    convertSpacerToArticle,
    updateStats,
    virtualizeNow,
    scheduleVirtualization,
    getStatsSnapshot
  };
}
