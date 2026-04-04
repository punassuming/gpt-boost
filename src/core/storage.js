export const MESSAGE_FLAGS_STORAGE_KEY = "messageFlagsByConversation";
export const KNOWN_CONVERSATIONS_STORAGE_KEY = "knownConversations";
export const CONVERSATION_DOCUMENTS_STORAGE_KEY = "conversationDocuments";
const MESSAGE_FLAGS_SAVE_DEBOUNCE_MS = 200;

export let currentConversationKey = "";
export let persistedPinnedMessageKeys = new Set();
export let persistedBookmarkedMessageKeys = new Set();

let saveFlagsTimer = null;
let flagsStoreCache = null;
let knownConversationsCache = null;
let conversationDocumentsCache = null;
let conversationDocumentHashCache = new Map();

// Track last persisted message count to avoid redundant storage writes
let _lastCountKey = "";
let _lastCount = 0;

/** Reset module-level caches (used in tests only). */
export function _resetStorageCacheForTesting() {
  flagsStoreCache = null;
  knownConversationsCache = null;
  conversationDocumentsCache = null;
  conversationDocumentHashCache = new Map();
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

export async function loadConversationDocumentsStore() {
  if (conversationDocumentsCache) return conversationDocumentsCache;
  const result = await extensionStorageGet(CONVERSATION_DOCUMENTS_STORAGE_KEY);
  const store = result[CONVERSATION_DOCUMENTS_STORAGE_KEY];
  conversationDocumentsCache = store && typeof store === "object" ? store : {};
  return conversationDocumentsCache;
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

export function getConversationIdFromKey(key) {
  return String(key || "").trim().replace(/^chat:/, "");
}

export function getConversationUrlFromKey(key, origin) {
  const conversationId = getConversationIdFromKey(key);
  if (!conversationId) return "";
  const defaultOrigin =
    typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : "https://chatgpt.com";
  return `${String(origin || defaultOrigin).replace(/\/$/, "")}/c/${conversationId}`;
}

function normalizeConversationTitle(title, key) {
  const trimmed = String(title || "").trim();
  if (!trimmed) {
    const id = getConversationIdFromKey(key);
    return id ? `Conversation ${id.slice(0, 8)}` : "Untitled conversation";
  }
  return trimmed
    .replace(/\s+[|·-]\s+ChatGPT$/i, "")
    .replace(/\s+-\s+OpenAI$/i, "")
    .trim();
}

function normalizeMessageText(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

function createSearchSnippet(text, start, length, radius = 52) {
  const source = normalizeMessageText(text);
  if (!source) return "";
  const safeStart = Math.max(0, Number(start) || 0);
  const safeLength = Math.max(0, Number(length) || 0);
  const snippetStart = Math.max(0, safeStart - radius);
  const snippetEnd = Math.min(source.length, safeStart + safeLength + radius);
  const prefix = snippetStart > 0 ? "…" : "";
  const suffix = snippetEnd < source.length ? "…" : "";
  return `${prefix}${source.slice(snippetStart, snippetEnd)}${suffix}`;
}

function sortConversationKeys(keys, knownStore = {}, currentConversation = "") {
  return Array.from(new Set(keys))
    .filter(Boolean)
    .sort((a, b) => {
      if (a === currentConversation) return -1;
      if (b === currentConversation) return 1;
      const aSeen = Date.parse(knownStore[a]?.lastSeenAt || "") || 0;
      const bSeen = Date.parse(knownStore[b]?.lastSeenAt || "") || 0;
      if (bSeen !== aSeen) return bSeen - aSeen;
      return String(a).localeCompare(String(b));
    });
}

export function getConversationDisplayTitle(key, documentEntry, knownEntry) {
  const docTitle = normalizeMessageText(documentEntry?.title || "");
  const knownTitle = normalizeMessageText(knownEntry?.title || "");
  return normalizeConversationTitle(docTitle || knownTitle, key);
}

export function buildConversationDocumentFromArticles({
  key,
  articleMap,
  getArticleMessageKey,
  getMessageRole,
  title,
  origin,
  updatedAt = new Date().toISOString()
}) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey || !(articleMap instanceof Map)) return null;

  const messages = Array.from(articleMap.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([virtualId, article], index) => {
      if (!(article instanceof HTMLElement)) return null;
      const textSource = article.querySelector("[data-message-author-role]") || article;
      const text = normalizeMessageText(textSource.textContent || "");
      const messageKey =
        typeof getArticleMessageKey === "function"
          ? getArticleMessageKey(article, virtualId)
          : "";
      return {
        order: index + 1,
        virtualId: String(virtualId),
        messageKey: String(messageKey || ""),
        role:
          typeof getMessageRole === "function"
            ? String(getMessageRole(article) || "message")
            : "message",
        text
      };
    })
    .filter((entry) => entry && (entry.text || entry.messageKey));

  const previewSource =
    messages.find((entry) => entry.role === "user" && entry.text) ||
    messages.find((entry) => entry.text) ||
    null;

  return {
    key: normalizedKey,
    title: normalizeConversationTitle(title, normalizedKey),
    url: getConversationUrlFromKey(normalizedKey, origin),
    updatedAt,
    messageCount: messages.length,
    preview: previewSource ? createSearchSnippet(previewSource.text, 0, 0, 72).replace(/^…|…$/g, "") : "",
    messages
  };
}

export async function saveConversationDocument(documentEntry) {
  const normalizedKey = String(documentEntry?.key || "").trim();
  if (!normalizedKey) return null;
  const store = await loadConversationDocumentsStore();
  const previous = store[normalizedKey] && typeof store[normalizedKey] === "object"
    ? store[normalizedKey]
    : {};
  const next = {
    ...previous,
    ...documentEntry,
    key: normalizedKey,
    messages: Array.isArray(documentEntry?.messages)
      ? documentEntry.messages
      : (Array.isArray(previous.messages) ? previous.messages : [])
  };
  const serialized = JSON.stringify(next);
  if (conversationDocumentHashCache.get(normalizedKey) === serialized) {
    return next;
  }
  store[normalizedKey] = next;
  conversationDocumentsCache = store;
  conversationDocumentHashCache.set(normalizedKey, serialized);
  await extensionStorageSet({ [CONVERSATION_DOCUMENTS_STORAGE_KEY]: store });
  return next;
}

export async function syncConversationDocumentFromArticles(options) {
  const documentEntry = buildConversationDocumentFromArticles(options);
  if (!documentEntry) return null;
  return saveConversationDocument(documentEntry);
}

export function listWorkspaceConversations({
  knownStore,
  documentsStore,
  flagsStore,
  currentConversationKey = ""
}) {
  const safeKnownStore = knownStore && typeof knownStore === "object" ? knownStore : {};
  const safeDocumentsStore = documentsStore && typeof documentsStore === "object" ? documentsStore : {};
  const safeFlagsStore = flagsStore && typeof flagsStore === "object" ? flagsStore : {};
  const keys = sortConversationKeys(
    [
      ...Object.keys(safeKnownStore),
      ...Object.keys(safeDocumentsStore),
      ...Object.keys(safeFlagsStore)
    ],
    safeKnownStore,
    currentConversationKey
  );

  return keys.map((key) => {
    const knownEntry = safeKnownStore[key] || {};
    const documentEntry = safeDocumentsStore[key] || {};
    const flagsEntry = safeFlagsStore[key] || {};
    return {
      key,
      conversationId: getConversationIdFromKey(key),
      title: getConversationDisplayTitle(key, documentEntry, knownEntry),
      url: documentEntry.url || getConversationUrlFromKey(key),
      preview: normalizeMessageText(documentEntry.preview || ""),
      note: normalizeMessageText(knownEntry.note || ""),
      visits: Number(knownEntry.visits || 0),
      lastSeenAt: knownEntry.lastSeenAt || documentEntry.updatedAt || "",
      firstSeenAt: knownEntry.firstSeenAt || "",
      messageCount: Number(knownEntry.messageCount || documentEntry.messageCount || 0),
      pinnedCount: Array.isArray(flagsEntry.pinned) ? flagsEntry.pinned.length : 0,
      bookmarkedCount: Array.isArray(flagsEntry.bookmarked) ? flagsEntry.bookmarked.length : 0,
      isCurrent: key === currentConversationKey
    };
  });
}

export function searchConversationDocuments({
  documentsStore,
  knownStore,
  query,
  currentConversationKey = "",
  limit = 250
}) {
  const safeDocumentsStore = documentsStore && typeof documentsStore === "object" ? documentsStore : {};
  const safeKnownStore = knownStore && typeof knownStore === "object" ? knownStore : {};
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return [];

  const results = [];
  const keys = sortConversationKeys(
    Object.keys(safeDocumentsStore),
    safeKnownStore,
    currentConversationKey
  );

  keys.forEach((key) => {
    if (results.length >= limit) return;
    const documentEntry = safeDocumentsStore[key];
    if (!documentEntry || typeof documentEntry !== "object") return;
    const knownEntry = safeKnownStore[key] || {};
    const title = getConversationDisplayTitle(key, documentEntry, knownEntry);

    const searchField = (text, base) => {
      const normalizedText = String(text || "");
      const lower = normalizedText.toLowerCase();
      let start = lower.indexOf(normalizedQuery);
      while (start !== -1 && results.length < limit) {
        results.push({
          ...base,
          matchIndexWithinField: Number(base.matchIndexWithinField || 0),
          start,
          length: normalizedQuery.length,
          snippet: createSearchSnippet(normalizedText, start, normalizedQuery.length)
        });
        base.matchIndexWithinField += 1;
        start = lower.indexOf(normalizedQuery, start + normalizedQuery.length);
      }
    };

    searchField(title, {
      conversationKey: key,
      conversationTitle: title,
      messageKey: "",
      role: "conversation",
      order: 0,
      field: "title",
      matchIndexWithinField: 0
    });

    const note = normalizeMessageText(knownEntry.note || "");
    if (note) {
      searchField(note, {
        conversationKey: key,
        conversationTitle: title,
        messageKey: "",
        role: "conversation",
        order: 0,
        field: "note",
        matchIndexWithinField: 0
      });
    }

    const messages = Array.isArray(documentEntry.messages) ? documentEntry.messages : [];
    messages.forEach((message) => {
      if (results.length >= limit) return;
      const text = String(message?.text || "");
      if (!text) return;
      searchField(text, {
        conversationKey: key,
        conversationTitle: title,
        messageKey: String(message?.messageKey || ""),
        role: String(message?.role || "message"),
        order: Number(message?.order || 0),
        field: "message",
        matchIndexWithinField: 0
      });
    });
  });

  return results;
}

export function buildCrossConversationMarksIndex({
  flagsStore,
  documentsStore,
  knownStore,
  currentConversationKey = ""
}) {
  const safeFlagsStore = flagsStore && typeof flagsStore === "object" ? flagsStore : {};
  const safeDocumentsStore = documentsStore && typeof documentsStore === "object" ? documentsStore : {};
  const safeKnownStore = knownStore && typeof knownStore === "object" ? knownStore : {};
  const keys = sortConversationKeys(
    Object.keys(safeFlagsStore),
    safeKnownStore,
    currentConversationKey
  );
  const items = [];

  keys.forEach((key) => {
    const flagsEntry = safeFlagsStore[key] || {};
    const pinnedKeys = Array.isArray(flagsEntry.pinned) ? flagsEntry.pinned : [];
    const bookmarkedKeys = Array.isArray(flagsEntry.bookmarked) ? flagsEntry.bookmarked : [];
    if (!pinnedKeys.length && !bookmarkedKeys.length) return;

    const documentEntry = safeDocumentsStore[key] || {};
    const knownEntry = safeKnownStore[key] || {};
    const title = getConversationDisplayTitle(key, documentEntry, knownEntry);
    const messageLookup = new Map();
    const messages = Array.isArray(documentEntry.messages) ? documentEntry.messages : [];
    messages.forEach((message) => {
      const messageKey = String(message?.messageKey || "").trim();
      if (messageKey) messageLookup.set(messageKey, message);
    });

    const merged = new Map();
    pinnedKeys.forEach((messageKey) => {
      const normalizedMessageKey = String(messageKey || "").trim();
      if (!normalizedMessageKey) return;
      merged.set(normalizedMessageKey, {
        pinned: true,
        bookmarked: false
      });
    });
    bookmarkedKeys.forEach((messageKey) => {
      const normalizedMessageKey = String(messageKey || "").trim();
      if (!normalizedMessageKey) return;
      const entry = merged.get(normalizedMessageKey) || { pinned: false, bookmarked: false };
      entry.bookmarked = true;
      merged.set(normalizedMessageKey, entry);
    });

    merged.forEach((flags, messageKey) => {
      const message = messageLookup.get(messageKey) || {};
      items.push({
        conversationKey: key,
        conversationTitle: title,
        url: documentEntry.url || getConversationUrlFromKey(key),
        lastSeenAt: knownEntry.lastSeenAt || documentEntry.updatedAt || "",
        note: normalizeMessageText(knownEntry.note || ""),
        messageKey,
        role: String(message.role || "message"),
        order: Number(message.order || 0),
        snippet: normalizeMessageText(message.text || "") || messageKey,
        pinned: !!flags.pinned,
        bookmarked: !!flags.bookmarked,
        isCurrent: key === currentConversationKey
      });
    });
  });

  return items.sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    const aSeen = Date.parse(a.lastSeenAt || "") || 0;
    const bSeen = Date.parse(b.lastSeenAt || "") || 0;
    if (bSeen !== aSeen) return bSeen - aSeen;
    if (a.order !== b.order) return a.order - b.order;
    return String(a.messageKey).localeCompare(String(b.messageKey));
  });
}

export function getArticleMessageKey(article, virtualId) {
  const cached = String(article.dataset.gptBoostMessageKey || "").trim();
  const cachedIsVirtual = cached.startsWith("virtual:");
  const migratePersistedKey = (nextKey) => {
    if (!cachedIsVirtual || !cached || !nextKey || nextKey === cached) return;
    let changed = false;
    if (persistedPinnedMessageKeys.has(cached)) {
      persistedPinnedMessageKeys.delete(cached);
      persistedPinnedMessageKeys.add(nextKey);
      changed = true;
    }
    if (persistedBookmarkedMessageKeys.has(cached)) {
      persistedBookmarkedMessageKeys.delete(cached);
      persistedBookmarkedMessageKeys.add(nextKey);
      changed = true;
    }
    if (changed) scheduleFlagsSave();
  };
  if (cached && !cachedIsVirtual) {
    return cached;
  }

  const nestedMessageEl = article.querySelector("[data-message-id]");
  const attrCandidate = (
    article.getAttribute("data-message-id") ||
    article.getAttribute("id") ||
    article.getAttribute("data-testid") ||
    (nestedMessageEl && nestedMessageEl.getAttribute("data-message-id")) ||
    ""
  ).trim();
  if (attrCandidate) {
    migratePersistedKey(attrCandidate);
    article.dataset.gptBoostMessageKey = attrCandidate;
    return attrCandidate;
  }

  const messageRoot = article.querySelector("[data-message-author-role]") || article;
  const role = (
    messageRoot instanceof HTMLElement
      ? messageRoot.getAttribute("data-message-author-role")
      : ""
  ) || "";
  const rawText = String(messageRoot instanceof HTMLElement ? messageRoot.textContent || "" : "")
    .replace(/\s+/g, " ")
    .trim();
  if (rawText) {
    const textSample = rawText.slice(0, 220);
    let hash = 2166136261;
    for (let index = 0; index < textSample.length; index += 1) {
      hash ^= textSample.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const fingerprint = `text:${role}:${rawText.length}:${(hash >>> 0).toString(36)}`;
    migratePersistedKey(fingerprint);
    article.dataset.gptBoostMessageKey = fingerprint;
    return fingerprint;
  }

  const fallback = `virtual:${virtualId}`;
  article.dataset.gptBoostMessageKey = fallback;
  return fallback;
}

export async function loadPersistedFlagsForConversation(onSync) {
  currentConversationKey = getConversationStorageKey();
  if (!currentConversationKey) {
    persistedPinnedMessageKeys.clear();
    persistedBookmarkedMessageKeys.clear();
    if (onSync) onSync();
    return;
  }
  scheduleKnownConversationSave(currentConversationKey);
  const store = await loadFlagsStore();
  const conversationFlags = store[currentConversationKey] || {};
  const pinned = Array.isArray(conversationFlags.pinned) ? conversationFlags.pinned : [];
  const bookmarked = Array.isArray(conversationFlags.bookmarked) ? conversationFlags.bookmarked : [];
  persistedPinnedMessageKeys.clear();
  pinned.forEach((key) => persistedPinnedMessageKeys.add(key));
  persistedBookmarkedMessageKeys.clear();
  bookmarked.forEach((key) => persistedBookmarkedMessageKeys.add(key));
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

export async function flushFlagsSave() {
  if (saveFlagsTimer !== null) {
    clearTimeout(saveFlagsTimer);
    saveFlagsTimer = null;
  }
  await saveFlagsToStorage();
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
