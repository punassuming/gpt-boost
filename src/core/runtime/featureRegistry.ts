import type { RuntimeFeature } from './types';

const DEFAULT_PRIORITY = 100;

export class RuntimeFeatureRegistry<TContext = unknown> {
  private readonly features: RuntimeFeature<TContext>[] = [];

  register(feature: RuntimeFeature<TContext>): void {
    this.features.push(feature);
    this.features.sort((a, b) => (a.priority ?? DEFAULT_PRIORITY) - (b.priority ?? DEFAULT_PRIORITY));
  }

  list(): ReadonlyArray<RuntimeFeature<TContext>> {
    return this.features;
  }

  dispatchInit(ctx: TContext): void {
    this.features.forEach((feature) => feature.init?.(ctx));
  }

  dispatchBoot(ctx: TContext): void {
    this.features.forEach((feature) => feature.onBoot?.(ctx));
  }

  dispatchTeardown(ctx: TContext): void {
    this.features.forEach((feature) => feature.onTeardown?.(ctx));
  }

  dispatchVirtualizeTick(ctx: TContext): void {
    this.features.forEach((feature) => feature.onVirtualizeTick?.(ctx));
  }

  dispatchStatsUpdated(ctx: TContext): void {
    this.features.forEach((feature) => feature.onStatsUpdated?.(ctx));
  }

  dispatchThemeChanged(ctx: TContext): void {
    this.features.forEach((feature) => feature.onThemeChanged?.(ctx));
  }

  dispatchVisibilityUpdate(totalMessages: number, renderedMessages: number, ctx: TContext): void {
    this.features.forEach((feature) =>
      feature.onVisibilityUpdate?.(totalMessages, renderedMessages, ctx)
    );
  }

  dispatchSidebarTabRender(tabId: string, container: HTMLElement, ctx: TContext): boolean {
    for (const feature of this.features) {
      if (!feature.onSidebarTabRender) continue;
      if (feature.onSidebarTabRender(tabId, container, ctx)) return true;
    }
    return false;
  }
}

export function createFeatureRegistry<TContext = unknown>(): RuntimeFeatureRegistry<TContext> {
  return new RuntimeFeatureRegistry<TContext>();
}
