export function styleFloatingRoundControl(button, sizePx, overrides = {}) {
  if (!(button instanceof HTMLElement)) return;

  button.style.width = `${sizePx}px`;
  button.style.height = `${sizePx}px`;
  button.style.borderRadius = "999px";
  button.style.border = "none";
  button.style.cursor = "pointer";
  button.style.background = "rgba(17, 24, 39, 0.75)";
  button.style.color = "#f9fafb";
  button.style.fontSize = "12px";
  button.style.fontWeight = "600";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.padding = "0";

  Object.entries(overrides).forEach(([propertyName, value]) => {
    if (typeof value === "undefined" || value === null) return;
    button.style[propertyName] = value;
  });
}
