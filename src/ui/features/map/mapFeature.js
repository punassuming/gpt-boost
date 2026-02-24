export function createMapFeature({
  refs,
  state,
  constants,
  deps
}) {
  function getMessageTextSnippet(virtualId, maxLength = constants.articleSnippetLength) {
    const article = state.articleMap.get(virtualId);
    if (!(article instanceof HTMLElement)) return `Message ${virtualId}`;
    const textSource = article.querySelector("[data-message-author-role]") || article;
    const raw = (textSource.textContent || "").trim().replace(/\s+/g, " ");
    if (!raw) return `Message ${virtualId}`;
    return raw.length > maxLength ? raw.slice(0, maxLength) + "…" : raw;
  }

  function getMessageRoleById(virtualId) {
    const article = state.articleMap.get(virtualId);
    if (!(article instanceof HTMLElement)) return "unknown";
    return deps.getMessageRole(article);
  }

  function getViewportAnchorVirtualId() {
    const viewport = deps.getViewportMetrics();
    if (viewport.height <= 0) return null;

    const viewportTop = viewport.top;
    const viewportBottom = viewportTop + viewport.height;
    const viewportCenter = viewportTop + viewport.height / 2;

    let bestVisibleId = null;
    let bestVisibleDistance = Number.POSITIVE_INFINITY;
    let nearestId = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    document.querySelectorAll("[data-virtual-id]").forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const id = el.dataset.virtualId;
      if (!id) return;

      const rect = el.getBoundingClientRect();
      const center = (rect.top + rect.bottom) / 2;
      const isVisible = rect.bottom >= viewportTop && rect.top <= viewportBottom;

      if (isVisible) {
        const distance = Math.abs(center - viewportCenter);
        if (distance < bestVisibleDistance) {
          bestVisibleDistance = distance;
          bestVisibleId = id;
        }
        return;
      }

      const distanceToViewport =
        rect.bottom < viewportTop ? viewportTop - rect.bottom : rect.top - viewportBottom;
      if (distanceToViewport < nearestDistance) {
        nearestDistance = distanceToViewport;
        nearestId = id;
      }
    });

    return bestVisibleId || nearestId;
  }

  function applyMapMarkerStyle(marker, isActive) {
    if (!(marker instanceof HTMLElement)) return;
    const theme = deps.getThemeTokens();
    const role = marker.dataset.role || "unknown";
    const roleStyle = deps.getRoleSurfaceStyle(role, theme);
    marker.style.background = roleStyle.accentColor;
    marker.style.opacity = isActive ? "1" : "0.6";
    marker.style.height = isActive ? "4px" : "2px";
    marker.style.boxShadow = isActive ? `0 0 0 1px ${roleStyle.borderColor}` : "none";
  }

  function applyMapNearbyItemStyle(item, isActive) {
    if (!(item instanceof HTMLElement)) return;
    const theme = deps.getThemeTokens();
    const role = item.dataset.role || "unknown";
    const roleStyle = deps.getRoleSurfaceStyle(role, theme);
    item.style.background = isActive ? roleStyle.activeSurfaceBg : roleStyle.surfaceBg;
    item.style.border = `1px solid ${roleStyle.borderColor}`;
    item.style.borderLeft = `3px solid ${roleStyle.accentColor}`;
    item.style.color = theme.text;
  }

  function populateMapNearbyList(listContainer, track, activeId) {
    if (!(listContainer instanceof HTMLElement) || !(track instanceof HTMLElement)) return;

    const markers = Array.from(
      track.querySelectorAll('[data-gpt-boost-map-marker="1"]')
    ).filter((el) => el instanceof HTMLElement);

    listContainer.innerHTML = "";
    if (!markers.length) return;

    const activeIndex = markers.findIndex((marker) => marker.dataset.virtualId === activeId);
    const centerIndex = activeIndex >= 0 ? activeIndex : 0;
    const start = Math.max(0, centerIndex - constants.sidebarMapNearbyRadius);
    const end = Math.min(markers.length - 1, centerIndex + constants.sidebarMapNearbyRadius);

    for (let idx = start; idx <= end; idx += 1) {
      const marker = markers[idx];
      const id = marker.dataset.virtualId;
      if (!id) continue;
      const role = marker.dataset.role || "unknown";
      const position = marker.dataset.position || String(idx + 1);

      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("data-gpt-boost-map-nearby-item", "1");
      item.dataset.virtualId = id;
      item.dataset.role = role;
      item.style.display = "flex";
      item.style.flexDirection = "column";
      item.style.gap = "2px";
      item.style.width = "100%";
      item.style.textAlign = "left";
      item.style.padding = "6px 8px";
      item.style.borderRadius = "10px";
      item.style.cursor = "pointer";
      item.style.fontFamily = "inherit";
      item.style.wordBreak = "break-word";

      const title = document.createElement("div");
      title.style.fontSize = "11px";
      title.style.opacity = "0.78";
      title.textContent = `${position}. ${deps.getRoleDisplayLabel(role)} • #${id}`;

      const snippet = document.createElement("div");
      snippet.style.fontSize = "12px";
      snippet.style.lineHeight = "1.3";
      snippet.textContent = getMessageTextSnippet(id, 90);

      item.appendChild(title);
      item.appendChild(snippet);
      applyMapNearbyItemStyle(item, id === activeId);
      item.addEventListener("click", () => deps.scrollToVirtualId(id));
      listContainer.appendChild(item);
    }
  }

  function updateMapViewportState(force = false) {
    if (!deps.isSidebarOpen() || deps.getActiveSidebarTab() !== "map" || !deps.getSidebarContentContainer()) return;

    const nextId = getViewportAnchorVirtualId();
    if (!nextId) return;
    if (!force && nextId === refs.activeMapVirtualId) return;

    const previousId = refs.activeMapVirtualId;
    refs.activeMapVirtualId = nextId;

    const sidebarContentContainer = deps.getSidebarContentContainer();
    const previousMarker = previousId
      ? sidebarContentContainer.querySelector(`[data-gpt-boost-map-marker][data-virtual-id="${deps.escapeSelectorValue(previousId)}"]`)
      : null;
    if (previousMarker instanceof HTMLElement) {
      applyMapMarkerStyle(previousMarker, false);
    }

    const nextMarker = sidebarContentContainer.querySelector(
      `[data-gpt-boost-map-marker][data-virtual-id="${deps.escapeSelectorValue(nextId)}"]`
    );
    if (!(nextMarker instanceof HTMLElement)) return;
    applyMapMarkerStyle(nextMarker, true);

    const statusEl = sidebarContentContainer.querySelector("[data-gpt-boost-map-status]");
    if (statusEl instanceof HTMLElement) {
      const total = Number(nextMarker.dataset.total || "0");
      const position = Number(nextMarker.dataset.position || "0");
      statusEl.textContent = total > 0 ? `Viewing ${position}/${total}` : "No messages";
    }

    const roleHost = sidebarContentContainer.querySelector("[data-gpt-boost-map-active-role]");
    const snippetEl = sidebarContentContainer.querySelector("[data-gpt-boost-map-active-snippet]");
    const metaEl = sidebarContentContainer.querySelector("[data-gpt-boost-map-active-meta]");
    const detailCard = sidebarContentContainer.querySelector("[data-gpt-boost-map-active-card]");

    const theme = deps.getThemeTokens();
    const role = nextMarker.dataset.role || getMessageRoleById(nextId);
    const roleStyle = deps.getRoleSurfaceStyle(role, theme);

    if (roleHost instanceof HTMLElement) {
      roleHost.innerHTML = "";
      roleHost.appendChild(deps.createRoleChip(roleStyle));
    }
    if (snippetEl instanceof HTMLElement) {
      snippetEl.textContent = getMessageTextSnippet(nextId, constants.sidebarMapSnippetLength);
    }
    if (metaEl instanceof HTMLElement) {
      const position = nextMarker.dataset.position || "?";
      const total = nextMarker.dataset.total || "?";
      metaEl.textContent = `#${nextId} • ${position}/${total}`;
    }
    if (detailCard instanceof HTMLElement) {
      detailCard.style.background = roleStyle.surfaceBg;
      detailCard.style.border = `1px solid ${roleStyle.borderColor}`;
      detailCard.style.borderLeft = `3px solid ${roleStyle.accentColor}`;
    }

    const nearbyList = sidebarContentContainer.querySelector("[data-gpt-boost-map-nearby]");
    const track = sidebarContentContainer.querySelector("[data-gpt-boost-map-track]");
    if (nearbyList instanceof HTMLElement && track instanceof HTMLElement) {
      populateMapNearbyList(nearbyList, track, nextId);
    }
  }

  function renderMapTabContent(container) {
    const theme = deps.getThemeTokens();
    deps.ensureVirtualIds();

    const entries = Array.from(state.articleMap.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    const status = document.createElement("div");
    status.setAttribute("data-gpt-boost-map-status", "1");
    status.style.fontSize = "11px";
    status.style.opacity = "0.8";
    status.style.padding = "2px 2px 4px";
    status.textContent = entries.length ? `Viewing 1/${entries.length}` : "No messages";
    container.appendChild(status);

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.style.fontSize = "12px";
      empty.style.opacity = "0.7";
      empty.style.padding = "4px 2px";
      empty.textContent = "No messages to map yet.";
      container.appendChild(empty);
      refs.activeMapVirtualId = null;
      return;
    }

    const trackShell = document.createElement("div");
    trackShell.style.border = `1px solid ${theme.panelBorder}`;
    trackShell.style.borderRadius = "10px";
    trackShell.style.padding = "8px";
    trackShell.style.background = theme.inputBg;

    const track = document.createElement("div");
    track.setAttribute("data-gpt-boost-map-track", "1");
    track.style.position = "relative";
    track.style.height = `${constants.sidebarMapTrackHeightPx}px`;
    track.style.borderRadius = "6px";
    track.style.background = "linear-gradient(to bottom, rgba(148,163,184,0.18), rgba(148,163,184,0.05))";

    entries.forEach(([id, article], index) => {
      const role = article instanceof HTMLElement ? deps.getMessageRole(article) : "unknown";
      const marker = document.createElement("button");
      marker.type = "button";
      marker.setAttribute("data-gpt-boost-map-marker", "1");
      marker.dataset.virtualId = id;
      marker.dataset.role = role;
      marker.dataset.position = String(index + 1);
      marker.dataset.total = String(entries.length);
      marker.style.position = "absolute";
      marker.style.left = "0";
      marker.style.right = "0";
      marker.style.top = entries.length <= 1
        ? "0%"
        : `${(index / (entries.length - 1)) * 100}%`;
      marker.style.transform = "translateY(-50%)";
      marker.style.border = "none";
      marker.style.padding = "0";
      marker.style.cursor = "pointer";
      marker.style.transition = "height 120ms ease, opacity 120ms ease, box-shadow 120ms ease";
      applyMapMarkerStyle(marker, false);
      marker.addEventListener("click", () => deps.scrollToVirtualId(id));
      track.appendChild(marker);
    });

    trackShell.appendChild(track);
    container.appendChild(trackShell);

    const detailCard = document.createElement("div");
    detailCard.setAttribute("data-gpt-boost-map-active-card", "1");
    detailCard.style.display = "flex";
    detailCard.style.flexDirection = "column";
    detailCard.style.gap = "4px";
    detailCard.style.marginTop = "8px";
    detailCard.style.padding = "8px";
    detailCard.style.borderRadius = "10px";

    const roleHost = document.createElement("div");
    roleHost.setAttribute("data-gpt-boost-map-active-role", "1");

    const snippetEl = document.createElement("div");
    snippetEl.setAttribute("data-gpt-boost-map-active-snippet", "1");
    snippetEl.style.fontSize = "12px";
    snippetEl.style.lineHeight = "1.35";
    snippetEl.style.wordBreak = "break-word";

    const metaEl = document.createElement("div");
    metaEl.setAttribute("data-gpt-boost-map-active-meta", "1");
    metaEl.style.fontSize = "10px";
    metaEl.style.opacity = "0.72";

    detailCard.appendChild(roleHost);
    detailCard.appendChild(snippetEl);
    detailCard.appendChild(metaEl);
    container.appendChild(detailCard);

    const nearbyTitle = document.createElement("div");
    nearbyTitle.style.fontSize = "11px";
    nearbyTitle.style.opacity = "0.8";
    nearbyTitle.style.padding = "4px 2px 2px";
    nearbyTitle.textContent = "Nearby";
    container.appendChild(nearbyTitle);

    const nearbyList = document.createElement("div");
    nearbyList.setAttribute("data-gpt-boost-map-nearby", "1");
    nearbyList.style.display = "flex";
    nearbyList.style.flexDirection = "column";
    nearbyList.style.gap = "6px";
    nearbyList.style.overflowY = "auto";
    nearbyList.style.minHeight = "0";
    nearbyList.style.flex = "1";
    container.appendChild(nearbyList);

    refs.activeMapVirtualId = null;
    updateMapViewportState(true);
  }

  return {
    getMessageTextSnippet,
    getMessageRoleById,
    getViewportAnchorVirtualId,
    applyMapMarkerStyle,
    applyMapNearbyItemStyle,
    populateMapNearbyList,
    updateMapViewportState,
    renderMapTabContent
  };
}
