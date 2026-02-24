import { getThemeMode, type ThemeTokens } from "../shell/theme";

export interface RoleSurfaceStyle {
  label: string;
  surfaceBg: string;
  activeSurfaceBg: string;
  borderColor: string;
  accentColor: string;
  chipBg: string;
  chipText: string;
}

export function getRoleDisplayLabel(role: string): string {
  const normalized = (role || "").toLowerCase();
  if (normalized === "user") return "User";
  if (normalized === "assistant") return "Agent";
  if (!normalized || normalized === "unknown" || normalized === "message") return "Message";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getRoleSurfaceStyle(role: string, theme: ThemeTokens): RoleSurfaceStyle {
  const normalized = (role || "").toLowerCase();
  const isDarkMode = getThemeMode() === "dark";
  const cssVar = (name: string, fallback: string) => {
    if (typeof document === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  };
  const userDark = cssVar("--gpt-boost-user-dark", "#303030");
  const assistantDark = cssVar("--gpt-boost-assistant-dark", "#202020");
  const userLight = cssVar("--gpt-boost-user-light", "#F4F4F4");
  const assistantLight = cssVar("--gpt-boost-assistant-light", "#FFFFFF");

  if (normalized === "user") {
    if (isDarkMode) {
      return {
        label: "User",
        surfaceBg: `${userDark}38`,
        activeSurfaceBg: `${userDark}52`,
        borderColor: userDark,
        accentColor: userDark,
        chipBg: userDark,
        chipText: "#f9fafb"
      };
    }
    return {
      label: "User",
      surfaceBg: userLight,
      activeSurfaceBg: "#ECECEC",
      borderColor: userLight,
      accentColor: userLight,
      chipBg: userLight,
      chipText: "#202123"
    };
  }

  if (normalized === "assistant") {
    if (isDarkMode) {
      return {
        label: "Agent",
        surfaceBg: assistantDark,
        activeSurfaceBg: "#2A2A2A",
        borderColor: "#2E2E2E",
        accentColor: "#3A3A3A",
        chipBg: assistantDark,
        chipText: "#ececf1"
      };
    }
    return {
      label: "Agent",
      surfaceBg: assistantLight,
      activeSurfaceBg: "#F8F8F8",
      borderColor: "#E8E8E8",
      accentColor: "#DADADA",
      chipBg: assistantLight,
      chipText: "#202123"
    };
  }

  return {
    label: getRoleDisplayLabel(role),
    surfaceBg: theme.buttonMutedBg,
    activeSurfaceBg: theme.buttonMutedBg,
    borderColor: theme.panelBorder,
    accentColor: theme.panelBorder,
    chipBg: theme.buttonMutedBg,
    chipText: theme.mutedText
  };
}

export function createRoleChip(roleStyle: RoleSurfaceStyle): HTMLDivElement {
  const chip = document.createElement("div");
  chip.textContent = roleStyle.label;
  chip.style.display = "inline-flex";
  chip.style.alignItems = "center";
  chip.style.width = "fit-content";
  chip.style.padding = "2px 7px";
  chip.style.borderRadius = "999px";
  chip.style.fontSize = "10px";
  chip.style.fontWeight = "600";
  chip.style.letterSpacing = "0.01em";
  chip.style.background = roleStyle.chipBg;
  chip.style.color = roleStyle.chipText;
  return chip;
}
