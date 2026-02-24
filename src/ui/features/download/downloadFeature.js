export function createDownloadFeature({
  refs,
  state,
  constants,
  deps
}) {
  function ensureDownloadButton() {
    if (refs.downloadButton && refs.downloadButton.isConnected) return refs.downloadButton;
    if (!document.body) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-chatgpt-download", "trigger");
    button.style.position = "fixed";
    button.style.right = `${constants.downloadButtonRightOffsetPx}px`;
    button.style.top = `${constants.downloadButtonTopOffsetPx}px`;
    button.style.zIndex = "10002";
    button.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.style.width = "14px";
    icon.style.height = "14px";
    icon.style.fill = "none";
    icon.style.stroke = "currentColor";
    icon.style.strokeWidth = "2";
    icon.style.strokeLinecap = "round";
    icon.style.strokeLinejoin = "round";
    const ln1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    ln1.setAttribute("x1", "12");
    ln1.setAttribute("y1", "3");
    ln1.setAttribute("x2", "12");
    ln1.setAttribute("y2", "15");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", "7 10 12 15 17 10");
    const ln2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    ln2.setAttribute("x1", "5");
    ln2.setAttribute("y1", "21");
    ln2.setAttribute("x2", "19");
    ln2.setAttribute("y2", "21");
    icon.appendChild(ln1);
    icon.appendChild(poly);
    icon.appendChild(ln2);

    button.appendChild(icon);
    button.setAttribute("aria-label", "Download conversation as Markdown");
    deps.styleSearchButton(button, constants.downloadButtonSizePx);
    button.style.display = "none";
    button.addEventListener("click", deps.downloadMarkdown);

    document.body.appendChild(button);
    refs.downloadButton = button;
    deps.applyFloatingUiOffsets();
    deps.applyThemeToUi();
    return button;
  }

  function updateDownloadVisibility(totalMessages) {
    const shouldShow = state.enabled && totalMessages > 0;
    const button = ensureDownloadButton();
    if (!button) return;
    button.style.display = shouldShow ? "flex" : "none";
  }

  return {
    ensureDownloadButton,
    updateDownloadVisibility
  };
}
