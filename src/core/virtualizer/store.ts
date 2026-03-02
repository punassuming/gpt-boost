import type {
  LifecycleStatus,
  VirtualizerConfig,
  VirtualizerRuntimeState,
  VirtualizerStore
} from "./types";

interface RuntimeLike {
  config: VirtualizerConfig;
  state: VirtualizerRuntimeState;
}

export function createVirtualizerStore(runtime: RuntimeLike): VirtualizerStore {
  const { config, state } = runtime;

  return {
    config,
    state,
    selectors: {
      isEnabled: () => !!state.enabled,
      isDebug: () => !!state.debug,
      getStats: () => state.stats
    },
    actions: {
      setEnabled(enabled: boolean) {
        state.enabled = enabled;
      },
      setDebug(debug: boolean) {
        state.debug = debug;
      },
      setLifecycleStatus(status: LifecycleStatus) {
        state.lifecycleStatus = status;
      }
    }
  };
}
