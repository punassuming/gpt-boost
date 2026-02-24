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
  if (!(element instanceof HTMLElement)) return;
  const normalized = query.trim().toLowerCase();
  if (!normalized) return;

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
      mark.textContent = matchText;
      mark.style.background = "rgba(251, 191, 36, 0.35)";
      mark.style.color = "inherit";
      mark.style.padding = "0 2px";
      mark.style.borderRadius = "4px";
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
}
