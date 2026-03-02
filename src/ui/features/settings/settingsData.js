export function getRoleThemeOptions(roleThemePresets = {}, customRoleThemeKey = "custom") {
  const options = Object.entries(roleThemePresets).map(([key, preset]) => ({
    value: key,
    label: preset && preset.label ? preset.label : key
  }));
  options.push({
    value: customRoleThemeKey,
    label: "Custom"
  });
  return options;
}

export function buildRoleThemePresetPatch({
  themeKey,
  roleThemePresets = {},
  normalizeRoleThemeKey,
  defaultRoleThemeKey = "chatgpt",
  customRoleThemeKey = "custom"
}) {
  if (typeof normalizeRoleThemeKey !== "function") return null;
  const normalizedThemeKey = normalizeRoleThemeKey(themeKey, defaultRoleThemeKey);
  if (normalizedThemeKey === customRoleThemeKey) return null;
  const preset = roleThemePresets[normalizedThemeKey];
  if (!preset) return null;
  return {
    roleThemeKey: normalizedThemeKey,
    userColorDark: preset.userColorDark,
    assistantColorDark: preset.assistantColorDark,
    userColorLight: preset.userColorLight,
    assistantColorLight: preset.assistantColorLight
  };
}

export function buildCustomRoleColorPatch({
  colorKey,
  colorValue,
  normalizeColorHex,
  fallbackColor,
  customRoleThemeKey = "custom"
}) {
  if (typeof normalizeColorHex !== "function") return null;
  if (!colorKey) return null;
  const normalizedColor = normalizeColorHex(colorValue, fallbackColor);
  return {
    roleThemeKey: customRoleThemeKey,
    [colorKey]: normalizedColor
  };
}

export function buildCachedConversationPayload({
  flagsStore,
  knownStore,
  summary,
  currentConversationKey = "(none)",
  maxItems = 10
}) {
  const safeFlagsStore = flagsStore && typeof flagsStore === "object" ? flagsStore : {};
  const safeKnownStore = knownStore && typeof knownStore === "object" ? knownStore : {};
  const flagKeys = Object.keys(safeFlagsStore);
  const knownKeys = Object.keys(safeKnownStore);

  return {
    totalCachedConversations: Number(summary?.totalKnownConversations || 0),
    totalFlaggedConversations: Number(summary?.totalFlaggedConversations || 0),
    currentConversationKey,
    cachedPinnedMessages: Number(summary?.cachedPinnedMessages || 0),
    cachedBookmarkedMessages: Number(summary?.cachedBookmarkedMessages || 0),
    approxFlagsBytes: Number(summary?.approxFlagsBytes || 0),
    approxKnownBytes: Number(summary?.approxKnownBytes || 0),
    flaggedConversations: flagKeys.slice(0, maxItems).map((key) => ({
      key,
      pinned: Array.isArray(safeFlagsStore[key]?.pinned) ? safeFlagsStore[key].pinned.length : 0,
      bookmarked: Array.isArray(safeFlagsStore[key]?.bookmarked) ? safeFlagsStore[key].bookmarked.length : 0
    })),
    knownConversations: knownKeys.slice(0, maxItems).map((key) => ({
      key,
      visits: Number(safeKnownStore[key]?.visits || 0),
      lastSeenAt: safeKnownStore[key]?.lastSeenAt || ""
    }))
  };
}
