export interface ThemeTokens {
  text: string;
  mutedText: string;
  panelBg: string;
  panelBorder: string;
  panelShadow: string;
  inputBg: string;
  inputBorder: string;
  buttonBg: string;
  buttonText: string;
  buttonShadow: string;
  buttonMutedBg: string;
  buttonMutedText: string;
  indicatorBg: string;
  indicatorShadow: string;
}

export function getThemeMode(): "dark" | "light" {
  const root = document.documentElement;
  if (root && root.classList.contains("dark")) return "dark";
  if (root && root.classList.contains("light")) return "light";
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

export function getThemeTokens(): ThemeTokens {
  const mode = getThemeMode();
  if (mode === "dark") {
    return {
      text: "#ececf1",
      mutedText: "rgba(236, 236, 241, 0.72)",
      panelBg: "rgba(32, 33, 35, 0.96)",
      panelBorder: "rgba(255, 255, 255, 0.1)",
      panelShadow: "0 8px 20px rgba(0, 0, 0, 0.45)",
      inputBg: "rgba(52, 53, 65, 0.92)",
      inputBorder: "rgba(255, 255, 255, 0.18)",
      buttonBg: "rgba(255, 255, 255, 0.12)",
      buttonText: "#ececf1",
      buttonShadow: "0 6px 16px rgba(0, 0, 0, 0.35)",
      buttonMutedBg: "rgba(255, 255, 255, 0.08)",
      buttonMutedText: "#ececf1",
      indicatorBg: "rgba(16, 163, 127, 0.7)",
      indicatorShadow: "0 4px 10px rgba(0, 0, 0, 0.35)"
    };
  }

  return {
    text: "#202123",
    mutedText: "rgba(32, 33, 35, 0.62)",
    panelBg: "rgba(255, 255, 255, 0.98)",
    panelBorder: "rgba(32, 33, 35, 0.1)",
    panelShadow: "0 8px 20px rgba(0, 0, 0, 0.12)",
    inputBg: "rgba(247, 247, 248, 0.95)",
    inputBorder: "rgba(32, 33, 35, 0.16)",
    buttonBg: "rgba(32, 33, 35, 0.85)",
    buttonText: "#ffffff",
    buttonShadow: "0 6px 16px rgba(0, 0, 0, 0.16)",
    buttonMutedBg: "rgba(32, 33, 35, 0.08)",
    buttonMutedText: "#202123",
    indicatorBg: "rgba(16, 163, 127, 0.66)",
    indicatorShadow: "0 4px 10px rgba(0, 0, 0, 0.12)"
  };
}
