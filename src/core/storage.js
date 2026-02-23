import { state } from '../constants.js';

const MESSAGE_FLAGS_STORAGE_KEY = "messageFlagsByConversation";
const MESSAGE_FLAGS_SAVE_DEBOUNCE_MS = 200;

export let currentConversationKey = "";
export let persistedPinnedMessageKeys = new Set();
export let persistedBookmarkedMessageKeys = new Set();

export function setCurrentConversationKey(key) {
    currentConversationKey = key;
}

let saveFlagsTimer = null;
let flagsStoreCache = null;

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

export function getConversationStorageKey() {
    const match = window.location.pathname.match(/\/c\/([^/?#]+)/);
    if (match && match[1]) return `chat:${match[1]}`;
    return "";
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
