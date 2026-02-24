export type LifecycleStatus = "IDLE" | "OBSERVING";

export interface VirtualizerStats {
  totalMessages: number;
  renderedMessages: number;
}

export interface VirtualizerRuntimeState {
  enabled: boolean;
  debug: boolean;
  requestAnimationScheduled: boolean;
  emptyVirtualizationRetryCount: number;
  nextVirtualId: number;
  lastUrl: string;
  lifecycleStatus: LifecycleStatus;
  scrollElement: HTMLElement | Window | null;
  cleanupScrollListener: (() => void) | null;
  observer: MutationObserver | null;
  bodyObserver?: MutationObserver | null;
  conversationRoot: HTMLElement | null;
  articleMap: Map<string, HTMLElement>;
  collapsedMessages: Set<string>;
  pinnedMessages: Set<string>;
  bookmarkedMessages: Set<string>;
  stats: VirtualizerStats;
}

export interface VirtualizerConfig {
  SCROLL_THROTTLE_MS: number;
  [key: string]: unknown;
}

export interface VirtualizerStore {
  config: VirtualizerConfig;
  state: VirtualizerRuntimeState;
  selectors: {
    isEnabled: () => boolean;
    isDebug: () => boolean;
    getStats: () => VirtualizerStats;
  };
  actions: {
    setEnabled: (enabled: boolean) => void;
    setDebug: (debug: boolean) => void;
    setLifecycleStatus: (status: LifecycleStatus) => void;
  };
}
