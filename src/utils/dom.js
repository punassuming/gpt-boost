import { config, state, log } from '../constants.js';

export function isVirtualSpacerNode(node) {
    return (
        node instanceof HTMLElement &&
        node.dataset &&
        node.dataset.chatgptVirtualSpacer === "1"
    );
}

export function getMessageRole(article) {
    if (!(article instanceof HTMLElement)) return "unknown";
    const roleEl = article.querySelector("[data-message-author-role]");
    if (roleEl instanceof HTMLElement) {
        return (roleEl.getAttribute("data-message-author-role") || "unknown").toLowerCase();
    }
    return "unknown";
}

/**
 * Find the main conversation root element.
 *
 * @returns {HTMLElement}
 */
export function findConversationRoot() {
    const selectors = [
        'main[class*="conversation" i]',
        '[role="main"]',
        "main",
        '[class*="thread" i]',
        '[class*="conversation" i]'
    ];

    for (const selector of selectors) {
        const root = document.querySelector(selector);
        if (root instanceof HTMLElement) {
            log("Found conversation root via selector:", selector);
            return root;
        }
    }

    log("Conversation root not found via selectors; using <body>");
    return document.body;
}

/** @returns {boolean} */
export function hasAnyMessages() {
    return getActiveConversationNodes().length > 0;
}

export function isElementVisibleForConversation(el) {
    // Intentionally minimal: only exclude elements that are explicitly display:none
    // at the article level itself. Do NOT walk ancestors — ChatGPT may wrap articles
    // in aria-hidden or transitional containers during load.
    if (!(el instanceof HTMLElement)) return false;
    return el.style.display !== "none";
}

export function getActiveConversationNodes() {
    const selector = config.ARTICLE_SELECTOR;
    const root = state.conversationRoot instanceof HTMLElement ? state.conversationRoot : document;
    const nodes = Array.from(root.querySelectorAll(selector))
        .filter((node) => node instanceof HTMLElement)
        .filter((node) => {
            const parent = node.parentElement;
            return !(parent && parent.closest(selector));
        })
        .filter((node) => isElementVisibleForConversation(node));

    return /** @type {HTMLElement[]} */ (nodes);
}

/**
 * Find the scrollable container for the conversation.
 *
 * @returns {HTMLElement | Window}
 */
export function findScrollContainer() {
    const firstMessage = getActiveConversationNodes()[0];

    if (firstMessage instanceof HTMLElement) {
        let ancestor = firstMessage.parentElement;
        while (
            ancestor &&
            ancestor !== document.body &&
            ancestor !== document.documentElement
        ) {
            const styles = getComputedStyle(ancestor);
            const overflowY = styles.overflowY;
            const isScrollable =
                (overflowY === "auto" || overflowY === "scroll") &&
                ancestor.scrollHeight > ancestor.clientHeight + 10;

            if (isScrollable) {
                log(
                    "Found scroll container from ancestor:",
                    ancestor.tagName,
                    ancestor.className
                );
                return ancestor;
            }
            ancestor = ancestor.parentElement;
        }
    }

    if (state.conversationRoot instanceof HTMLElement) {
        const root = state.conversationRoot;
        const styles = getComputedStyle(root);
        if (
            (styles.overflowY === "auto" || styles.overflowY === "scroll") &&
            root.scrollHeight > root.clientHeight + 10
        ) {
            log("Using conversation root as scroll container");
            return root;
        }
    }

    const docScroll =
        document.scrollingElement || document.documentElement || document.body;

    log("Using document.scrollingElement as scroll container");
    return docScroll;
}
