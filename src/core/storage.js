export const MESSAGE_FLAGS_STORAGE_KEY = "messageFlagsByConversation";
export const KNOWN_CONVERSATIONS_STORAGE_KEY = "knownConversations";
const MESSAGE_FLAGS_SAVE_DEBOUNCE_MS = 200;

export let currentConversationKey = "";
export let persistedPinnedMessageKeys = new Set();
export let persistedBookmarkedMessageKeys = new Set();

let saveFlagsTimer = null;
let flagsStoreCache = null;
let knownConversationsCache = null;

// Track last persisted message count to avoid redundant storage writes
let _lastCountKey = "";
let _lastCount = 0;

/** Reset module-level caches (used in tests only). */
export function _resetStorageCacheForTesting() {
  flagsStoreCache = null;
  knownConversationsCache = null;
  _lastCountKey = "";
  _lastCount = 0;
}

export function getExtensionStorageArea() {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return chrome.storage.local || chrome.storage.sync || null;
  }
  return null;
}

export function extensionStorageGet(key) {
  const area = getExtensionStorageArea();
  if (!area) return Promise.resolve({});
  return new Promise((resolve) => {
    area.get(key, (result) => resolve(result || {}));
  });
}

export function extensionStorageSet(payload) {
  const area = getExtensionStorageArea();
  if (!area) return Promise.resolve();
  return new Promise((resolve) => {
    area.set(payload, () => resolve());
  });
}

export async function loadFlagsStore() {
  if (flagsStoreCache) return flagsStoreCache;
  const result = await extensionStorageGet(MESSAGE_FLAGS_STORAGE_KEY);
  const store = result[MESSAGE_FLAGS_STORAGE_KEY];
  flagsStoreCache = store && typeof store === "object" ? store : {};
  return flagsStoreCache;
}

export async function loadKnownConversationsStore() {
  if (knownConversationsCache) return knownConversationsCache;
  const result = await extensionStorageGet(KNOWN_CONVERSATIONS_STORAGE_KEY);
  const store = result[KNOWN_CONVERSATIONS_STORAGE_KEY];
  knownConversationsCache = store && typeof store === "object" ? store : {};
  return knownConversationsCache;
}

export function getConversationStorageKey() {
  const match = window.location.pathname.match(/\/c\/([^/?#]+)/);
  if (match && match[1]) return `chat:${match[1]}`;
  return "";
}

export async function saveKnownConversationKey(key) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) return;
  const store = await loadKnownConversationsStore();
  const existing = store[normalizedKey];
  store[normalizedKey] = {
    firstSeenAt: existing?.firstSeenAt || new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    visits: Number(existing?.visits || 0) + 1
  };
  await extensionStorageSet({ [KNOWN_CONVERSATIONS_STORAGE_KEY]: store });
}

export function scheduleKnownConversationSave(key) {
  saveKnownConversationKey(key).catch(() => { });
}

export function setCurrentConversationKey(key) {
  currentConversationKey = key;
  // Reset count tracking so the new conversation persists its count promptly
  _lastCountKey = "";
  _lastCount = 0;
  scheduleKnownConversationSave(key);
}

/**
 * Persist the total message count for a known conversation.
 * Skips the write if the count has not changed since last call.
 */
export async function updateConversationMessageCount(key, messageCount) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey || !(messageCount > 0)) return;
  if (normalizedKey === _lastCountKey && messageCount === _lastCount) return;
  _lastCountKey = normalizedKey;
  _lastCount = messageCount;
  const store = await loadKnownConversationsStore();
  const existing = store[normalizedKey];
  if (!existing) return; // Only update entries already tracked by saveKnownConversationKey
  store[normalizedKey] = { ...existing, messageCount };
  await extensionStorageSet({ [KNOWN_CONVERSATIONS_STORAGE_KEY]: store });
}

/**
 * Save a freeform note for a known conversation.
 */
export async function saveConversationNote(key, note) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) return;
  const store = await loadKnownConversationsStore();
  const existing = store[normalizedKey];
  const trimmedNote = String(note || "").trim();
  if (existing) {
    store[normalizedKey] = { ...existing, note: trimmedNote };
  } else {
    store[normalizedKey] = {
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      visits: 0,
      note: trimmedNote
    };
  }
  await extensionStorageSet({ [KNOWN_CONVERSATIONS_STORAGE_KEY]: store });
}

export function getArticleMessageKey(article, virtualId) {
  if (article.dataset.gptBoostMessageKey) {
    return article.dataset.gptBoostMessageKey;
  }

  const nestedMessageEl = article.querySelector("[data-message-id]");
  const candidate = (
    article.getAttribute("data-message-id") ||
    article.getAttribute("id") ||
    article.getAttribute("data-testid") ||
    (nestedMessageEl && nestedMessageEl.getAttribute("data-message-id")) ||
    `virtual:${virtualId}`
  ).trim();

  article.dataset.gptBoostMessageKey = candidate;
  return candidate;
}

export async function loadPersistedFlagsForConversation(onSync) {
  currentConversationKey = getConversationStorageKey();
  if (!currentConversationKey) {
    persistedPinnedMessageKeys = new Set();
    persistedBookmarkedMessageKeys = new Set();
    if (onSync) onSync();
    return;
  }
  scheduleKnownConversationSave(currentConversationKey);
  const store = await loadFlagsStore();
  const conversationFlags = store[currentConversationKey] || {};
  const pinned = Array.isArray(conversationFlags.pinned) ? conversationFlags.pinned : [];
  const bookmarked = Array.isArray(conversationFlags.bookmarked) ? conversationFlags.bookmarked : [];
  persistedPinnedMessageKeys = new Set(pinned);
  persistedBookmarkedMessageKeys = new Set(bookmarked);
  if (onSync) onSync();
}

export async function saveFlagsToStorage() {
  if (!currentConversationKey) return;
  const store = await loadFlagsStore();
  const pinned = Array.from(persistedPinnedMessageKeys);
  const bookmarked = Array.from(persistedBookmarkedMessageKeys);

  if (!pinned.length && !bookmarked.length) {
    delete store[currentConversationKey];
  } else {
    store[currentConversationKey] = { pinned, bookmarked };
  }

  await extensionStorageSet({ [MESSAGE_FLAGS_STORAGE_KEY]: store });
}

export function scheduleFlagsSave() {
  if (saveFlagsTimer !== null) {
    clearTimeout(saveFlagsTimer);
  }
  saveFlagsTimer = setTimeout(() => {
    saveFlagsTimer = null;
    saveFlagsToStorage().catch(() => { });
  }, MESSAGE_FLAGS_SAVE_DEBOUNCE_MS);
}

export function summarizeConversationCaches(flagsStore, knownConversationsStore) {
  const flags = flagsStore && typeof flagsStore === "object" ? flagsStore : {};
  const known = knownConversationsStore && typeof knownConversationsStore === "object" ? knownConversationsStore : {};

  const flaggedConversationKeys = Object.keys(flags);
  const knownConversationKeys = Object.keys(known);
  let pinnedTotal = 0;
  let bookmarkedTotal = 0;

  flaggedConversationKeys.forEach((key) => {
    const conversationFlags = flags[key] || {};
    pinnedTotal += Array.isArray(conversationFlags.pinned) ? conversationFlags.pinned.length : 0;
    bookmarkedTotal += Array.isArray(conversationFlags.bookmarked) ? conversationFlags.bookmarked.length : 0;
  });

  return {
    totalKnownConversations: knownConversationKeys.length,
    totalFlaggedConversations: flaggedConversationKeys.length,
    cachedPinnedMessages: pinnedTotal,
    cachedBookmarkedMessages: bookmarkedTotal,
    approxFlagsBytes: JSON.stringify(flags).length,
    approxKnownBytes: JSON.stringify(known).length
  };
}
