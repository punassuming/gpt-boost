import { findSearchMatches } from '../src/ui/features/search/searchIndex.js';

describe('search index', () => {
  it('creates one result per individual hit in a message', () => {
    document.body.innerHTML = `
      <article data-virtual-id="1">
        <div data-message-author-role="assistant">alpha beta alpha gamma alpha</div>
      </article>
    `;

    const entries = new Map([
      ['1', document.querySelector('article')]
    ]);

    const result = findSearchMatches(entries, 'alpha');
    expect(result.matchCount).toBe(3);
    expect(result.results).toHaveLength(3);
    expect(result.results.map((entry) => entry.matchIndexWithinMessage)).toEqual([0, 1, 2]);
  });

  it('keeps result ordering stable across messages and hit positions', () => {
    document.body.innerHTML = `
      <article data-virtual-id="2">
        <div data-message-author-role="assistant">beta alpha</div>
      </article>
      <article data-virtual-id="1">
        <div data-message-author-role="assistant">alpha alpha</div>
      </article>
    `;

    const entries = new Map([
      ['2', document.querySelector('article[data-virtual-id="2"]')],
      ['1', document.querySelector('article[data-virtual-id="1"]')]
    ]);

    const result = findSearchMatches(entries, 'alpha');
    expect(result.results.map((entry) => `${entry.id}:${entry.matchIndexWithinMessage}`)).toEqual([
      '1:0',
      '1:1',
      '2:0'
    ]);
  });
});
