export function renderSearchSidebarTab({
  container,
  theme,
  searchState,
  styleSearchButton,
  getSearchResultSummary,
  scheduleSearch,
  navigateSearch,
  updateSearchCountLabel,
  focusSearchResult,
  createRoleChip,
  getRoleSurfaceStyle,
  renderSidebarTab,
  getSidebarContentContainer
}) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "6px";
  row.style.alignItems = "center";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Search chat...";
  input.setAttribute("aria-label", "Search chat");
  input.style.flex = "1";
  input.style.minWidth = "0";
  input.style.height = "32px";
  input.style.borderRadius = "8px";
  input.style.padding = "0 10px";
  input.style.fontSize = "12px";
  input.style.fontFamily = "inherit";
  input.style.background = theme.inputBg;
  input.style.border = `1px solid ${theme.inputBorder}`;
  input.style.color = theme.text;
  input.value = searchState.query || "";
  input.addEventListener("input", (event) => scheduleSearch(event.target.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      navigateSearch(event.shiftKey ? -1 : 1);
    }
  });

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.textContent = "↑";
  styleSearchButton(prevBtn, 24);
  prevBtn.style.display = "flex";
  prevBtn.style.background = theme.buttonMutedBg;
  prevBtn.style.color = theme.buttonMutedText;
  prevBtn.addEventListener("click", () => navigateSearch(-1));

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.textContent = "↓";
  styleSearchButton(nextBtn, 24);
  nextBtn.style.display = "flex";
  nextBtn.style.background = theme.buttonMutedBg;
  nextBtn.style.color = theme.buttonMutedText;
  nextBtn.addEventListener("click", () => navigateSearch(1));

  row.appendChild(input);
  row.appendChild(prevBtn);
  row.appendChild(nextBtn);

  const count = document.createElement("div");
  count.style.fontSize = "11px";
  count.style.opacity = "0.8";
  count.style.padding = "2px 2px 6px";

  const totalSections = searchState.results.length;
  const active = totalSections && searchState.activeIndex >= 0 ? searchState.activeIndex + 1 : 0;
  count.textContent = `${active}/${totalSections} sections • ${searchState.matchCount} matches`;

  container.appendChild(row);
  container.appendChild(count);

  const resultsList = document.createElement("div");
  resultsList.setAttribute("data-gpt-boost-search-results", "1");
  resultsList.style.display = "flex";
  resultsList.style.flexDirection = "column";
  resultsList.style.gap = "6px";
  resultsList.style.overflowY = "auto";
  resultsList.style.minHeight = "0";
  resultsList.style.flex = "1";

  if (!searchState.results.length) {
    const empty = document.createElement("div");
    empty.style.fontSize = "12px";
    empty.style.opacity = "0.7";
    empty.style.padding = "4px 2px";
    empty.textContent = searchState.query ? "No matches found." : "Type to search the conversation.";
    resultsList.appendChild(empty);
  } else {
    const total = searchState.results.length;
    searchState.results.forEach((id, idx) => {
      const summary = getSearchResultSummary(id, idx, total);
      const roleStyle = getRoleSurfaceStyle(summary.role, theme);
      const item = document.createElement("button");
      item.type = "button";
      item.style.textAlign = "left";
      item.style.border = `1px solid ${roleStyle.borderColor}`;
      item.style.borderLeft = `3px solid ${roleStyle.accentColor}`;
      item.style.borderRadius = "10px";
      item.style.padding = "8px";
      item.style.background = idx === searchState.activeIndex ? roleStyle.activeSurfaceBg : roleStyle.surfaceBg;
      item.style.color = theme.text;
      item.style.cursor = "pointer";
      item.style.fontFamily = "inherit";
      item.style.display = "flex";
      item.style.flexShrink = "0";
      item.style.flexDirection = "column";
      item.style.gap = "4px";
      item.addEventListener("click", () => {
        const previousScrollTop = resultsList.scrollTop;
        searchState.activeIndex = idx;
        updateSearchCountLabel();
        focusSearchResult(id);
        renderSidebarTab("search");
        setTimeout(() => {
          const sidebarContentContainer = getSidebarContentContainer();
          if (!sidebarContentContainer) return;
          const nextList = sidebarContentContainer.querySelector('[data-gpt-boost-search-results="1"]');
          if (nextList instanceof HTMLElement) {
            nextList.scrollTop = previousScrollTop;
          }
        }, 0);
      });

      const roleChip = createRoleChip(roleStyle);

      const title = document.createElement("div");
      title.textContent = summary.title;
      title.style.fontSize = "12px";
      title.style.lineHeight = "1.35";
      title.style.wordBreak = "break-word";

      const subtitle = document.createElement("div");
      subtitle.textContent = summary.subtitle;
      subtitle.style.fontSize = "10px";
      subtitle.style.opacity = "0.72";

      item.appendChild(roleChip);
      item.appendChild(title);
      item.appendChild(subtitle);
      resultsList.appendChild(item);
    });
  }

  container.appendChild(resultsList);
  setTimeout(() => input.focus(), 0);
}
