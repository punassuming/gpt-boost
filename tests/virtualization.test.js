import { state } from '../src/constants.js';
import '../src/virtualization.js';

describe('virtualization module', () => {
  const virtualizer = window.ChatGPTVirtualScroller.virtualizer;

  beforeEach(() => {
    document.body.innerHTML = '';
    state.articleMap.clear();
    state.nextVirtualId = 1;
    state.enabled = true;
    state.stats.totalMessages = 0;
    state.stats.renderedMessages = 0;
  });

  it('exposes forceVirtualize for direct warmup runs', () => {
    expect(typeof virtualizer.forceVirtualize).toBe('function');
  });

  it('forceVirtualize updates message stats for visible articles', () => {
    const article = document.createElement('article');
    document.body.appendChild(article);

    virtualizer.forceVirtualize();

    const snapshot = virtualizer.getStatsSnapshot();
    expect(snapshot.totalMessages).toBe(1);
    expect(snapshot.renderedMessages).toBe(1);
  });
});
