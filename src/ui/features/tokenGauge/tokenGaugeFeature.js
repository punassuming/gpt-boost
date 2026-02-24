export function createTokenGaugeFeature({
  refs,
  state,
  constants
}) {
  function ensureTokenGaugeElement() {
    if (refs.tokenGaugeElement && refs.tokenGaugeElement.isConnected) return refs.tokenGaugeElement;
    const el = document.createElement("div");
    el.setAttribute("data-chatgpt-token-gauge", "1");
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.right = "0";
    el.style.height = "3px";
    el.style.zIndex = "10001";
    el.style.pointerEvents = "none";
    el.style.background = "transparent";
    el.style.transition = "background 0.8s ease";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    refs.tokenGaugeElement = el;
    return el;
  }

  function updateTokenGauge() {
    if (!state.enabled) {
      if (refs.tokenGaugeElement) refs.tokenGaugeElement.style.background = "transparent";
      return;
    }

    const totalChars = Array.from(state.articleMap.values())
      .reduce((sum, node) => sum + (node.textContent || "").length, 0);
    const estimatedTokens = totalChars / 4;
    const ratio = Math.min(1, estimatedTokens / constants.tokenGaugeMaxTokens);

    const el = ensureTokenGaugeElement();

    if (ratio < 0.01) {
      el.style.background = "transparent";
      el.removeAttribute("title");
      return;
    }

    let r;
    let g;
    let b;
    if (ratio <= constants.tokenGaugeYellowRatio) {
      const t = ratio / constants.tokenGaugeYellowRatio;
      r = Math.round(t * 210);
      g = 180;
      b = 0;
    } else if (ratio <= constants.tokenGaugeRedRatio) {
      const t = (ratio - constants.tokenGaugeYellowRatio) /
        (constants.tokenGaugeRedRatio - constants.tokenGaugeYellowRatio);
      r = 210;
      g = Math.round(180 * (1 - t));
      b = 0;
    } else {
      r = 210;
      g = 0;
      b = 0;
    }

    const alpha = 0.35 + ratio * 0.5;
    const pct = Math.round(ratio * 100);
    el.style.background = `linear-gradient(to right, rgba(${r},${g},${b},${alpha}) 0%, rgba(${r},${g},${b},${alpha}) ${pct}%, transparent ${pct}%)`;
    el.title = `~${Math.round(estimatedTokens).toLocaleString()} estimated tokens`;
  }

  return {
    ensureTokenGaugeElement,
    updateTokenGauge
  };
}
