import {
  updateConversationMessageCount,
  saveConversationNote,
  _resetStorageCacheForTesting
} from '../src/core/storage.js';

// Mock chrome.storage.local
const mockStore = {};
global.chrome = {
  storage: {
    local: {
      get: jest.fn((key, cb) => {
        if (key === null) {
          cb({ ...mockStore });
        } else {
          cb({ [key]: mockStore[key] !== undefined ? mockStore[key] : undefined });
        }
      }),
      set: jest.fn((payload, cb) => {
        Object.assign(mockStore, payload);
        if (cb) cb();
      })
    }
  }
};

describe('storage helpers', () => {
  beforeEach(() => {
    // Clear mock store and module-level caches before each test
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
    jest.clearAllMocks();
    _resetStorageCacheForTesting();
  });

  describe('updateConversationMessageCount', () => {
    it('skips write if key is empty', async () => {
      await updateConversationMessageCount('', 5);
      expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('skips write if messageCount is 0 or negative', async () => {
      await updateConversationMessageCount('chat:abc', 0);
      expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('skips write if entry does not exist in store', async () => {
      // Store is empty, so no existing entry
      await updateConversationMessageCount('chat:abc', 10);
      expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('persists messageCount when entry exists', async () => {
      mockStore['knownConversations'] = {
        'chat:abc': { firstSeenAt: '2025-01-01', lastSeenAt: '2025-01-02', visits: 1 }
      };
      await updateConversationMessageCount('chat:abc', 42);
      const saved = mockStore['knownConversations']['chat:abc'];
      expect(saved.messageCount).toBe(42);
    });

    it('skips second write when count has not changed', async () => {
      mockStore['knownConversations'] = {
        'chat:abc': { firstSeenAt: '2025-01-01', lastSeenAt: '2025-01-02', visits: 1 }
      };
      await updateConversationMessageCount('chat:abc', 42);
      jest.clearAllMocks();
      await updateConversationMessageCount('chat:abc', 42);
      expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('saveConversationNote', () => {
    it('skips write if key is empty', async () => {
      await saveConversationNote('', 'hello');
      expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('adds note to existing entry', async () => {
      mockStore['knownConversations'] = {
        'chat:abc': { firstSeenAt: '2025-01-01', lastSeenAt: '2025-01-02', visits: 2 }
      };
      await saveConversationNote('chat:abc', 'My favourite chat');
      const saved = mockStore['knownConversations']['chat:abc'];
      expect(saved.note).toBe('My favourite chat');
      expect(saved.visits).toBe(2); // other fields preserved
    });

    it('creates entry if it does not exist', async () => {
      await saveConversationNote('chat:new', 'New note');
      const saved = mockStore['knownConversations']['chat:new'];
      expect(saved).toBeDefined();
      expect(saved.note).toBe('New note');
    });

    it('trims whitespace from note', async () => {
      mockStore['knownConversations'] = {
        'chat:abc': { firstSeenAt: '2025-01-01', lastSeenAt: '2025-01-02', visits: 1 }
      };
      await saveConversationNote('chat:abc', '  trimmed  ');
      const saved = mockStore['knownConversations']['chat:abc'];
      expect(saved.note).toBe('trimmed');
    });
  });
});
