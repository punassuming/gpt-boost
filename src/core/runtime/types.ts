export type FeatureId = string;

export interface FeatureContext<TState = unknown, TConfig = unknown> {
  state: TState;
  config: TConfig;
  services: unknown;
  refs: Record<string, unknown>;
}

export interface RuntimeFeature<TContext = FeatureContext> {
  id: FeatureId;
  priority?: number;
  init?: (ctx: TContext) => void;
  onBoot?: (ctx: TContext) => void;
  onTeardown?: (ctx: TContext) => void;
  onVirtualizeTick?: (ctx: TContext) => void;
  onStatsUpdated?: (ctx: TContext) => void;
  onThemeChanged?: (ctx: TContext) => void;
  onSidebarTabRender?: (tabId: string, container: HTMLElement, ctx: TContext) => boolean;
  onVisibilityUpdate?: (
    totalMessages: number,
    renderedMessages: number,
    ctx: TContext
  ) => void;
}
