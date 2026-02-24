export const SIDEBAR_WIDTH_MIN_PX = 240;
export const SIDEBAR_WIDTH_MAX_PX = 720;
export const CONVERSATION_PADDING_MIN_PX = 0;
export const CONVERSATION_PADDING_MAX_PX = 80;
export const COMPOSER_WIDTH_MIN_PX = 480;
export const COMPOSER_WIDTH_MAX_PX = 1400;
export const SCROLL_THROTTLE_MIN_MS = 16;
export const SCROLL_THROTTLE_MAX_MS = 250;
export const MUTATION_DEBOUNCE_MIN_MS = 0;
export const MUTATION_DEBOUNCE_MAX_MS = 500;

export const DEFAULT_EXTENSION_SETTINGS = {
  enabled: true,
  debug: false,
  marginPx: 2000,
  sidebarWidthPx: 320,
  minimapVisible: true,
  sidebarHotkey: "Alt+Shift+B",
  conversationPaddingPx: 16,
  composerWidthPx: 768,
  scrollThrottleMs: 50,
  mutationDebounceMs: 50,
  userColorDark: "#303030",
  assistantColorDark: "#202020",
  userColorLight: "#F4F4F4",
  assistantColorLight: "#FFFFFF"
};

export const SETTINGS_STORAGE_KEYS = Object.keys(DEFAULT_EXTENSION_SETTINGS);

const KNOWN_MODIFIER_KEYS = new Set(["ctrl", "alt", "shift", "meta"]);

function clampInt(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.min(max, Math.max(min, rounded));
}

export function normalizeSidebarWidthPx(value, fallback = DEFAULT_EXTENSION_SETTINGS.sidebarWidthPx) {
  return clampInt(value, SIDEBAR_WIDTH_MIN_PX, SIDEBAR_WIDTH_MAX_PX, fallback);
}

export function normalizeConversationPaddingPx(
  value,
  fallback = DEFAULT_EXTENSION_SETTINGS.conversationPaddingPx
) {
  return clampInt(value, CONVERSATION_PADDING_MIN_PX, CONVERSATION_PADDING_MAX_PX, fallback);
}

export function normalizeComposerWidthPx(value, fallback = DEFAULT_EXTENSION_SETTINGS.composerWidthPx) {
  return clampInt(value, COMPOSER_WIDTH_MIN_PX, COMPOSER_WIDTH_MAX_PX, fallback);
}

export function normalizeScrollThrottleMs(
  value,
  fallback = DEFAULT_EXTENSION_SETTINGS.scrollThrottleMs
) {
  return clampInt(value, SCROLL_THROTTLE_MIN_MS, SCROLL_THROTTLE_MAX_MS, fallback);
}

export function normalizeMutationDebounceMs(
  value,
  fallback = DEFAULT_EXTENSION_SETTINGS.mutationDebounceMs
) {
  return clampInt(value, MUTATION_DEBOUNCE_MIN_MS, MUTATION_DEBOUNCE_MAX_MS, fallback);
}

function normalizeHexDigit(char) {
  return /[0-9a-f]/i.test(char) ? char : "0";
}

export function normalizeColorHex(value, fallback) {
  const source = String(value || "").trim();
  if (!source) return fallback;
  const token = source.startsWith("#") ? source.slice(1) : source;
  if (token.length === 3) {
    const expanded =
      normalizeHexDigit(token[0]) + normalizeHexDigit(token[0]) +
      normalizeHexDigit(token[1]) + normalizeHexDigit(token[1]) +
      normalizeHexDigit(token[2]) + normalizeHexDigit(token[2]);
    return `#${expanded}`.toUpperCase();
  }
  if (token.length === 6) {
    const safe = token
      .split("")
      .map((ch) => normalizeHexDigit(ch))
      .join("");
    return `#${safe}`.toUpperCase();
  }
  return fallback;
}

function normalizeHotkeyMainKey(raw) {
  const key = String(raw || "").trim();
  if (!key) return "";
  const lower = key.toLowerCase();
  const aliases = {
    esc: "Escape",
    return: "Enter",
    plus: "+",
    spacebar: "Space",
    space: "Space",
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    del: "Delete",
    cmd: "Meta",
    command: "Meta",
    option: "Alt",
    control: "Ctrl"
  };
  if (aliases[lower]) return aliases[lower];
  if (/^f([1-9]|1[0-2])$/.test(lower)) return lower.toUpperCase();
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function normalizeSidebarHotkey(value, fallback = DEFAULT_EXTENSION_SETTINGS.sidebarHotkey) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  const parts = raw
    .split("+")
    .map((token) => token.trim())
    .filter(Boolean);
  if (!parts.length) return fallback;

  const modifiers = [];
  let mainKey = "";

  parts.forEach((part) => {
    const lower = part.toLowerCase();
    if (lower === "control") {
      if (!modifiers.includes("Ctrl")) modifiers.push("Ctrl");
      return;
    }
    if (lower === "cmd" || lower === "command") {
      if (!modifiers.includes("Meta")) modifiers.push("Meta");
      return;
    }
    if (KNOWN_MODIFIER_KEYS.has(lower)) {
      const normalized = lower.charAt(0).toUpperCase() + lower.slice(1);
      if (!modifiers.includes(normalized)) modifiers.push(normalized);
      return;
    }
    if (!mainKey) mainKey = normalizeHotkeyMainKey(part);
  });

  if (!mainKey) return fallback;
  const orderedModifiers = ["Ctrl", "Alt", "Shift", "Meta"].filter((m) => modifiers.includes(m));
  return [...orderedModifiers, mainKey].join("+");
}

export function hotkeyMatchesKeyboardEvent(hotkey, event) {
  if (!event) return false;
  const normalized = normalizeSidebarHotkey(hotkey);
  const tokens = normalized.split("+");
  const keyToken = tokens[tokens.length - 1];
  const mods = new Set(tokens.slice(0, -1).map((t) => t.toLowerCase()));

  const wantsCtrl = mods.has("ctrl");
  const wantsAlt = mods.has("alt");
  const wantsShift = mods.has("shift");
  const wantsMeta = mods.has("meta");

  if (!!event.ctrlKey !== wantsCtrl) return false;
  if (!!event.altKey !== wantsAlt) return false;
  if (!!event.shiftKey !== wantsShift) return false;
  if (!!event.metaKey !== wantsMeta) return false;

  const eventKey = normalizeHotkeyMainKey(event.key);
  return eventKey.toLowerCase() === keyToken.toLowerCase();
}

export function normalizeExtensionSettings(input, options = {}) {
  const source = input && typeof input === "object" ? input : {};
  const minMarginPx = Number.isFinite(options.minMarginPx) ? Number(options.minMarginPx) : 500;
  const maxMarginPx = Number.isFinite(options.maxMarginPx) ? Number(options.maxMarginPx) : 5000;
  const defaultMarginPx = Number.isFinite(options.defaultMarginPx)
    ? Number(options.defaultMarginPx)
    : DEFAULT_EXTENSION_SETTINGS.marginPx;

  return {
    enabled: typeof source.enabled === "boolean" ? source.enabled : DEFAULT_EXTENSION_SETTINGS.enabled,
    debug: typeof source.debug === "boolean" ? source.debug : DEFAULT_EXTENSION_SETTINGS.debug,
    marginPx: clampInt(source.marginPx, minMarginPx, maxMarginPx, defaultMarginPx),
    sidebarWidthPx: normalizeSidebarWidthPx(source.sidebarWidthPx),
    minimapVisible:
      typeof source.minimapVisible === "boolean"
        ? source.minimapVisible
        : DEFAULT_EXTENSION_SETTINGS.minimapVisible,
    sidebarHotkey: normalizeSidebarHotkey(source.sidebarHotkey, DEFAULT_EXTENSION_SETTINGS.sidebarHotkey),
    conversationPaddingPx: normalizeConversationPaddingPx(source.conversationPaddingPx),
    composerWidthPx: normalizeComposerWidthPx(source.composerWidthPx),
    scrollThrottleMs: normalizeScrollThrottleMs(source.scrollThrottleMs),
    mutationDebounceMs: normalizeMutationDebounceMs(source.mutationDebounceMs),
    userColorDark: normalizeColorHex(source.userColorDark, DEFAULT_EXTENSION_SETTINGS.userColorDark),
    assistantColorDark: normalizeColorHex(source.assistantColorDark, DEFAULT_EXTENSION_SETTINGS.assistantColorDark),
    userColorLight: normalizeColorHex(source.userColorLight, DEFAULT_EXTENSION_SETTINGS.userColorLight),
    assistantColorLight: normalizeColorHex(source.assistantColorLight, DEFAULT_EXTENSION_SETTINGS.assistantColorLight)
  };
}

export function getSettingsStorageArea() {
  if (typeof chrome === "undefined" || !chrome.storage) return null;
  return chrome.storage.sync || chrome.storage.local || null;
}

export function readStorageArea(area) {
  return new Promise((resolve) => {
    if (!area) {
      resolve({});
      return;
    }
    area.get(null, (result) => resolve(result || {}));
  });
}
