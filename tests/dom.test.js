import { isVirtualSpacerNode, getMessageRole, isElementVisibleForConversation, findConversationRoot } from '../src/utils/dom';

// We need to mock the exported `config` and `state` as they are internal.
jest.mock('../src/constants.js', () => ({
    config: {
        ARTICLE_SELECTOR: 'article',
    },
    state: {
        conversationRoot: null,
    },
    log: jest.fn(),
}));

describe('DOM Utilities', () => {

    describe('isVirtualSpacerNode', () => {
        it('returns true when element is a virtual spacer', () => {
            const spacer = document.createElement('div');
            spacer.dataset.chatgptVirtualSpacer = '1';
            expect(isVirtualSpacerNode(spacer)).toBe(true);
        });

        it('returns false for non-spacer elements', () => {
            const div = document.createElement('div');
            expect(isVirtualSpacerNode(div)).toBe(false);
        });

        it('returns false for null', () => {
            expect(isVirtualSpacerNode(null)).toBe(false);
        });
    });

    describe('getMessageRole', () => {
        it('returns the role correctly', () => {
            const article = document.createElement('article');
            const inner = document.createElement('div');
            inner.setAttribute('data-message-author-role', 'user');
            article.appendChild(inner);

            expect(getMessageRole(article)).toBe('user');
        });

        it('returns unknown if role element is not present', () => {
            const article = document.createElement('article');
            expect(getMessageRole(article)).toBe('unknown');
        });
    });

    describe('isElementVisibleForConversation', () => {
        it('returns true for a standard element', () => {
            const div = document.createElement('div');
            expect(isElementVisibleForConversation(div)).toBe(true);
        });

        it('returns false if display is none', () => {
            const div = document.createElement('div');
            div.style.display = 'none';
            expect(isElementVisibleForConversation(div)).toBe(false);
        });
    });

    describe('findConversationRoot', () => {
        let mainContent;

        beforeEach(() => {
            // Clear document body before each test
            document.body.innerHTML = '';
            mainContent = null;
        });

        it('finds conversation root based on selectors', () => {
            mainContent = document.createElement('main');
            mainContent.className = "conversation";
            document.body.appendChild(mainContent);

            const root = findConversationRoot();
            expect(root).toBe(mainContent);
        });

        it('defaults to document.body if no selectors match', () => {
            const root = findConversationRoot();
            expect(root).toBe(document.body);
        });
    });

});
