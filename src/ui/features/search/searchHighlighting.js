export function clearSearchTextHighlights(element) {
  if (!element) return;
  const marks = element.querySelectorAll(
    'mark[data-chatgpt-virtual-search="hit"]'
  );
  marks.forEach((mark) => {
    const textNode = document.createTextNode(mark.textContent || "");
    mark.replaceWith(textNode);
  });
  element.normalize();
}

export function highlightMatchesInElement(element, query) {
  if (!(element instanceof HTMLElement)) return [];
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  clearSearchTextHighlights(element);

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        const parent = node.parentElement;
        if (
          parent &&
          parent.closest('mark[data-chatgpt-virtual-search="hit"]')
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  let matchIndex = 0;
  textNodes.forEach((node) => {
    const text = node.nodeValue || "";
    const lower = text.toLowerCase();
    let index = lower.indexOf(normalized);
    if (index === -1) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    while (index !== -1) {
      if (index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, index))
        );
      }

      const matchText = text.slice(index, index + normalized.length);
      const mark = document.createElement("mark");
      mark.dataset.chatgptVirtualSearch = "hit";
      mark.dataset.gptBoostSearchHitIndex = String(matchIndex++);
      mark.textContent = matchText;
      mark.style.background = "rgba(251, 191, 36, 0.35)";
      mark.style.color = "inherit";
      mark.style.padding = "0 2px";
      mark.style.borderRadius = "4px";
      mark.style.scrollMargin = "96px";
      fragment.appendChild(mark);

      lastIndex = index + normalized.length;
      index = lower.indexOf(normalized, lastIndex);
    }

    if (lastIndex < text.length) {
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex))
      );
    }

    node.replaceWith(fragment);
  });

  return Array.from(element.querySelectorAll('mark[data-chatgpt-virtual-search="hit"]'));
}

export function setActiveSearchMatch(element, matchIndex) {
  if (!(element instanceof HTMLElement)) return null;
  const marks = Array.from(element.querySelectorAll('mark[data-chatgpt-virtual-search="hit"]'));
  marks.forEach((mark) => {
    if (!(mark instanceof HTMLElement)) return;
    mark.style.background = "rgba(251, 191, 36, 0.35)";
    mark.style.boxShadow = "none";
  });

  const active = marks.find((mark) => mark.dataset.gptBoostSearchHitIndex === String(matchIndex));
  if (!(active instanceof HTMLElement)) return null;
  active.style.background = "rgba(251, 191, 36, 0.7)";
  active.style.boxShadow = "0 0 0 1px rgba(251, 191, 36, 0.85)";
  return active;
}
