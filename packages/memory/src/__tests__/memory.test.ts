/**
 * ALTER EGO OS — Memory Engine Tests
 *
 * Comprehensive test suite for the MemoryStore, MemoryIndex, and CompactionEngine.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStore } from '../memory-store.js';
import { MemoryIndex } from '../memory-index.js';
import { CompactionEngine } from '../compaction.js';
import { EventBus } from '@alterego/event-bus';
import type {
  MemoryEntry,
  MemoryType,
  MemoryQuery,
  MemoryStoreConfig,
} from '../types.js';
import { DEFAULT_TTL, MEMORY_TYPES } from '../types.js';

// ─── Helpers ─────────────────────────────────────────────────

function createTestStore(config?: MemoryStoreConfig, eventBus?: EventBus): MemoryStore {
  return new MemoryStore(config, eventBus);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── MemoryStore Tests ──────────────────────────────────────

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = createTestStore();
  });

  // ─── Store Operation ─────────────────────────────────────

  describe('store()', () => {
    it('should store a new memory entry', async () => {
      const entry = await store.store('user', 'preference', { theme: 'dark' });

      expect(entry.id).toBeDefined();
      expect(entry.type).toBe('user');
      expect(entry.key).toBe('preference');
      expect(entry.value).toEqual({ theme: 'dark' });
      expect(entry.createdAt).toBeDefined();
      expect(entry.updatedAt).toBeDefined();
    });

    it('should store entry with tags', async () => {
      const entry = await store.store('project', 'my-project', { name: 'Test' }, {
        tags: ['important', 'active'],
      });

      expect(entry.tags).toEqual(['important', 'active']);
    });

    it('should store entry with custom TTL', async () => {
      const entry = await store.store('prompt', 'template-1', 'Hello', { ttl: 1000 });

      expect(entry.expiresAt).toBeDefined();
      const expiresAt = new Date(entry.expiresAt!).getTime();
      const now = Date.now();
      expect(expiresAt).toBeGreaterThan(now);
      expect(expiresAt).toBeLessThanOrEqual(now + 1500); // Allow some tolerance
    });

    it('should store entry with default TTL for type', async () => {
      const entry = await store.store('user', 'pref', 'value');

      expect(entry.expiresAt).toBeDefined();
      // user TTL is 30 days by default
      const ttl = DEFAULT_TTL.user;
      const expiresAt = new Date(entry.expiresAt!).getTime();
      const expectedExpiry = new Date(entry.createdAt).getTime() + ttl;
      expect(Math.abs(expiresAt - expectedExpiry)).toBeLessThan(1000);
    });

    it('should store entry with metadata', async () => {
      const entry = await store.store('bug', 'bug-1', { desc: 'crash' }, {
        metadata: { severity: 'high', reporter: 'alice' },
      });

      expect(entry.metadata).toEqual({ severity: 'high', reporter: 'alice' });
    });

    it('should overwrite existing entry with same type+key by default', async () => {
      await store.store('user', 'theme', 'dark');
      const updated = await store.store('user', 'theme', 'light');

      expect(updated.value).toBe('light');
      expect(updated.key).toBe('theme');

      // Should only be one entry
      const stats = await store.getStats();
      expect(stats.totalEntries).toBe(1);
    });

    it('should throw when overwrite is false and entry exists', async () => {
      await store.store('user', 'theme', 'dark');

      await expect(
        store.store('user', 'theme', 'light', { overwrite: false })
      ).rejects.toThrow('Memory entry already exists');
    });

    it('should support all 8 memory types', async () => {
      for (const type of MEMORY_TYPES) {
        const entry = await store.store(type, `test-${type}`, { type });
        expect(entry.type).toBe(type);
      }

      const stats = await store.getStats();
      expect(stats.totalEntries).toBe(8);
    });
  });

  // ─── Recall Operation ────────────────────────────────────

  describe('recall()', () => {
    it('should recall a stored entry', async () => {
      await store.store('user', 'theme', { mode: 'dark' });
      const entry = await store.recall('user', 'theme');

      expect(entry).toBeDefined();
      expect(entry!.value).toEqual({ mode: 'dark' });
    });

    it('should return undefined for non-existent key', async () => {
      const entry = await store.recall('user', 'nonexistent');
      expect(entry).toBeUndefined();
    });

    it('should return undefined for expired entries', async () => {
      // Store with very short TTL
      await store.store('prompt', 'temp', 'data', { ttl: 1 });

      // Wait for expiration
      await delay(50);

      const entry = await store.recall('prompt', 'temp');
      expect(entry).toBeUndefined();
    });

    it('should not return entries without TTL as expired', async () => {
      // Store without TTL (by setting a very long custom TTL or modifying config)
      const customStore = createTestStore({
        defaultTTL: { user: undefined as unknown as number }, // no TTL
      });
      await customStore.store('user', 'permanent', 'data');

      const entry = await customStore.recall('user', 'permanent');
      expect(entry).toBeDefined();
      expect(entry!.value).toBe('data');
    });
  });

  // ─── RecallOrDefault Operation ───────────────────────────

  describe('recallOrDefault()', () => {
    it('should return the stored value when entry exists', async () => {
      await store.store('user', 'lang', 'en');
      const value = await store.recallOrDefault('user', 'lang', 'fr');
      expect(value).toBe('en');
    });

    it('should return default value when entry does not exist', async () => {
      const value = await store.recallOrDefault('user', 'nonexistent', 'default');
      expect(value).toBe('default');
    });

    it('should return default value when entry is expired', async () => {
      await store.store('prompt', 'temp', 'data', { ttl: 1 });
      await delay(50);

      const value = await store.recallOrDefault('prompt', 'temp', 'default');
      expect(value).toBe('default');
    });
  });

  // ─── Search Operation ────────────────────────────────────

  describe('search()', () => {
    beforeEach(async () => {
      await store.store('user', 'pref-theme', 'dark', { tags: ['ui', 'preference'] });
      await store.store('user', 'pref-lang', 'en', { tags: ['ui', 'language'] });
      await store.store('project', 'proj-1', { name: 'Alpha' }, { tags: ['active'] });
      await store.store('project', 'proj-2', { name: 'Beta' }, { tags: ['archived'] });
      await store.store('bug', 'bug-1', { desc: 'Crash' }, { tags: ['critical', 'ui'] });
      await store.store('decision', 'dec-1', 'Use React', { tags: ['architecture'] });
    });

    it('should search by type', async () => {
      const results = await store.search({ type: 'user' });
      expect(results).toHaveLength(2);
      expect(results.every((e) => e.type === 'user')).toBe(true);
    });

    it('should search by key prefix', async () => {
      const results = await store.search({ keyPrefix: 'pref-' });
      expect(results).toHaveLength(2);
    });

    it('should search by tags with AND semantics', async () => {
      const results = await store.search({ tags: ['ui', 'preference'] });
      expect(results).toHaveLength(1);
      expect(results[0]!.key).toBe('pref-theme');
    });

    it('should return empty when tag AND has no matches', async () => {
      const results = await store.search({ tags: ['ui', 'critical', 'language'] });
      expect(results).toHaveLength(0);
    });

    it('should search by time range', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 100000);

      const results = await store.search({
        from: now.toISOString(),
        to: future.toISOString(),
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should apply limit', async () => {
      const results = await store.search({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should apply offset', async () => {
      const all = await store.search({});
      const offset = await store.search({ offset: 2 });
      expect(offset.length).toBe(all.length - 2);
    });

    it('should combine multiple filters with AND semantics', async () => {
      const results = await store.search({
        type: 'user',
        tags: ['ui'],
      });
      expect(results).toHaveLength(2);
    });

    it('should return empty results for non-matching combined filters', async () => {
      const results = await store.search({
        type: 'bug',
        tags: ['language'],
      });
      expect(results).toHaveLength(0);
    });

    it('should search by exact key', async () => {
      const results = await store.search({ type: 'user', key: 'pref-theme' });
      expect(results).toHaveLength(1);
      expect(results[0]!.key).toBe('pref-theme');
    });
  });

  // ─── Forget Operation ────────────────────────────────────

  describe('forget()', () => {
    it('should forget an entry by ID', async () => {
      const entry = await store.store('user', 'temp', 'data');
      const result = await store.forget(entry.id);

      expect(result).toBe(true);
      const recalled = await store.recall('user', 'temp');
      expect(recalled).toBeUndefined();
    });

    it('should forget an entry by type and key', async () => {
      await store.store('user', 'temp', 'data');
      const result = await store.forget('user', 'temp');

      expect(result).toBe(true);
      const recalled = await store.recall('user', 'temp');
      expect(recalled).toBeUndefined();
    });

    it('should return false for non-existent entry', async () => {
      const result = await store.forget('nonexistent-id');
      expect(result).toBe(false);
    });

    it('should return false for non-existent type+key', async () => {
      const result = await store.forget('user', 'nonexistent');
      expect(result).toBe(false);
    });
  });

  // ─── ForgetByType Operation ──────────────────────────────

  describe('forgetByType()', () => {
    it('should delete all entries of a given type', async () => {
      await store.store('user', 'a', 1);
      await store.store('user', 'b', 2);
      await store.store('project', 'c', 3);

      const count = await store.forgetByType('user');

      expect(count).toBe(2);
      const stats = await store.getStats();
      expect(stats.entriesByType.user).toBe(0);
      expect(stats.entriesByType.project).toBe(1);
    });

    it('should return 0 for type with no entries', async () => {
      const count = await store.forgetByType('architecture');
      expect(count).toBe(0);
    });
  });

  // ─── Statistics ──────────────────────────────────────────

  describe('getStats()', () => {
    it('should return empty stats for new store', async () => {
      const stats = await store.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.expiredEntries).toBe(0);
      for (const type of MEMORY_TYPES) {
        expect(stats.entriesByType[type]).toBe(0);
      }
    });

    it('should count entries correctly', async () => {
      await store.store('user', 'a', 1);
      await store.store('user', 'b', 2);
      await store.store('project', 'c', 3);

      const stats = await store.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.entriesByType.user).toBe(2);
      expect(stats.entriesByType.project).toBe(1);
    });

    it('should track oldest and newest entries', async () => {
      const entry1 = await store.store('user', 'first', 'data');
      await delay(10);
      const entry2 = await store.store('user', 'second', 'data');

      const stats = await store.getStats();

      expect(stats.oldestEntry).toBe(entry1.createdAt);
      expect(stats.newestEntry).toBe(entry2.createdAt);
    });

    it('should count expired entries', async () => {
      await store.store('user', 'active', 'data'); // Not expired
      await store.store('prompt', 'expired', 'data', { ttl: 1 }); // Will expire

      await delay(50);

      const stats = await store.getStats();
      expect(stats.expiredEntries).toBe(1);
    });
  });

  // ─── Export / Import ─────────────────────────────────────

  describe('export() / import()', () => {
    it('should export all memories', async () => {
      await store.store('user', 'pref', 'dark');
      await store.store('project', 'proj-1', { name: 'Test' });

      const exported = await store.export();

      expect(exported.version).toBe('1.0.0');
      expect(exported.exportedAt).toBeDefined();
      expect(exported.entries).toHaveLength(2);
      expect(exported.config).toBeDefined();
    });

    it('should exclude expired entries from export', async () => {
      await store.store('user', 'active', 'data');
      await store.store('prompt', 'expired', 'data', { ttl: 1 });

      await delay(50);

      const exported = await store.export();
      expect(exported.entries).toHaveLength(1);
      expect(exported.entries[0]!.key).toBe('active');
    });

    it('should import memories from export', async () => {
      await store.store('user', 'pref', 'dark');
      await store.store('project', 'proj-1', { name: 'Test' });

      const exported = await store.export();

      // Create new store and import
      const newStore = createTestStore();
      const count = await newStore.import(exported);

      expect(count).toBe(2);

      const entry = await newStore.recall('user', 'pref');
      expect(entry!.value).toBe('dark');
    });

    it('should overwrite existing entries on import', async () => {
      await store.store('user', 'pref', 'dark');
      const exported = await store.export();

      // Store a different value first
      const newStore = createTestStore();
      await newStore.store('user', 'pref', 'light');

      // Import should overwrite
      await newStore.import(exported);

      const entry = await newStore.recall('user', 'pref');
      expect(entry!.value).toBe('dark');
    });

    it('should skip expired entries on import', async () => {
      // Create an export with an already-expired entry
      const pastDate = new Date(Date.now() - 10000).toISOString();
      const expiredEntry: MemoryEntry = {
        id: 'mem_expired_1',
        type: 'prompt',
        key: 'expired',
        value: 'old data',
        tags: [],
        createdAt: pastDate,
        updatedAt: pastDate,
        expiresAt: new Date(Date.now() - 5000).toISOString(),
      };

      const data = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        entries: [expiredEntry],
        config: {} as MemoryStoreConfig,
      };

      const count = await store.import(data);
      expect(count).toBe(0);
    });
  });

  // ─── Clear ───────────────────────────────────────────────

  describe('clear()', () => {
    it('should clear all memories', async () => {
      await store.store('user', 'a', 1);
      await store.store('project', 'b', 2);

      await store.clear();

      const stats = await store.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  // ─── TTL Behavior ────────────────────────────────────────

  describe('TTL behavior', () => {
    it('should apply default TTL per type', async () => {
      const userEntry = await store.store('user', 'test', 'data');
      const promptEntry = await store.store('prompt', 'test', 'data');

      // Both should have expiresAt set
      expect(userEntry.expiresAt).toBeDefined();
      expect(promptEntry.expiresAt).toBeDefined();

      // User TTL (30 days) should be longer than prompt TTL (7 days)
      const userTTL = new Date(userEntry.expiresAt!).getTime() - new Date(userEntry.createdAt).getTime();
      const promptTTL = new Date(promptEntry.expiresAt!).getTime() - new Date(promptEntry.createdAt).getTime();
      expect(userTTL).toBeGreaterThan(promptTTL);
    });

    it('should allow custom TTL to override default', async () => {
      const entry = await store.store('user', 'test', 'data', { ttl: 5000 });
      const ttl = new Date(entry.expiresAt!).getTime() - new Date(entry.createdAt).getTime();
      expect(ttl).toBeLessThan(10000); // Way less than default 30 days
    });

    it('should auto-expire entries on recall', async () => {
      await store.store('prompt', 'temp', 'data', { ttl: 1 });
      await delay(50);

      const entry = await store.recall('prompt', 'temp');
      expect(entry).toBeUndefined();
    });
  });

  // ─── Event Bus Integration ───────────────────────────────

  describe('EventBus integration', () => {
    let eventBus: EventBus;
    let storeWithBus: MemoryStore;

    beforeEach(() => {
      eventBus = new EventBus();
      storeWithBus = createTestStore(undefined, eventBus);
    });

    it('should emit memory.stored event on store', async () => {
      const handler = vi.fn();
      eventBus.subscribe('memory.stored', handler);

      await storeWithBus.store('user', 'test', 'data');

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0]![0];
      expect(event.payload.type).toBe('user');
      expect(event.payload.key).toBe('test');
    });

    it('should emit memory.recalled event on successful recall', async () => {
      const handler = vi.fn();
      eventBus.subscribe('memory.recalled', handler);

      await storeWithBus.store('user', 'test', 'data');
      await storeWithBus.recall('user', 'test');

      // One stored + one recalled
      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0]![0];
      expect(event.payload.hit).toBe(true);
    });

    it('should emit memory.recalled with hit=false on miss', async () => {
      const handler = vi.fn();
      eventBus.subscribe('memory.recalled', handler);

      await storeWithBus.recall('user', 'nonexistent');

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0]![0];
      expect(event.payload.hit).toBe(false);
    });

    it('should emit memory.forgotten event on forget', async () => {
      const handler = vi.fn();
      eventBus.subscribe('memory.forgotten', handler);

      const entry = await storeWithBus.store('user', 'test', 'data');
      await storeWithBus.forget(entry.id);

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0]![0];
      expect(event.payload.key).toBe('test');
    });

    it('should emit memory.compacted event on compaction', async () => {
      const handler = vi.fn();
      eventBus.subscribe('memory.compacted', handler);

      // Create enough entries to trigger compaction
      const smallStore = createTestStore({
        maxEntriesPerType: 3,
        compactionThreshold: 5,
      }, eventBus);

      for (let i = 0; i < 5; i++) {
        await smallStore.store('user', `key-${i}`, `value-${i}`);
      }

      await smallStore.compact('user');

      expect(handler).toHaveBeenCalled();
    });

    it('should not emit events without event bus', async () => {
      // Just verify it doesn't throw
      await store.store('user', 'test', 'data');
      await store.recall('user', 'test');
      await store.forget('user', 'test');
    });
  });

  // ─── Auto Compaction ─────────────────────────────────────

  describe('auto compaction', () => {
    it('should auto-compact when threshold is exceeded', async () => {
      const autoStore = createTestStore({
        maxEntriesPerType: 3,
        compactionThreshold: 6,
        enableAutoCompaction: true,
      });

      // Add 6 entries of type 'user' — should trigger auto-compaction
      for (let i = 0; i < 6; i++) {
        await autoStore.store('user', `key-${i}`, `value-${i}`);
      }

      const stats = await autoStore.getStats();
      // After compaction, entries should be reduced
      expect(stats.entriesByType.user).toBeLessThanOrEqual(5); // Some entries compacted
    });
  });
});

// ─── MemoryIndex Tests ──────────────────────────────────────

describe('MemoryIndex', () => {
  let index: MemoryIndex;

  beforeEach(() => {
    index = new MemoryIndex();
  });

  function makeEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
    return {
      id: overrides.id ?? `mem_${Math.random().toString(36).substring(2, 8)}`,
      type: overrides.type ?? 'user',
      key: overrides.key ?? 'test',
      value: overrides.value ?? 'data',
      tags: overrides.tags ?? [],
      createdAt: overrides.createdAt ?? new Date().toISOString(),
      updatedAt: overrides.updatedAt ?? new Date().toISOString(),
      ...overrides,
    };
  }

  describe('addEntry()', () => {
    it('should add entry to all indexes', () => {
      const entry = makeEntry({ id: 'e1', type: 'user', key: 'pref', tags: ['ui'] });
      index.addEntry(entry);

      expect(index.getByKey('user', 'pref')).toBe('e1');
      expect(index.getByType('user').has('e1')).toBe(true);
      expect(index.getByTag('ui').has('e1')).toBe(true);
    });
  });

  describe('removeEntry()', () => {
    it('should remove entry from all indexes', () => {
      const entry = makeEntry({ id: 'e1', type: 'user', key: 'pref', tags: ['ui'] });
      index.addEntry(entry);
      index.removeEntry(entry);

      expect(index.getByKey('user', 'pref')).toBeUndefined();
      expect(index.getByType('user').size).toBe(0);
      expect(index.getByTag('ui').size).toBe(0);
    });
  });

  describe('updateEntry()', () => {
    it('should handle tag changes', () => {
      const old = makeEntry({ id: 'e1', type: 'user', key: 'pref', tags: ['ui'] });
      const updated = makeEntry({ id: 'e1', type: 'user', key: 'pref', tags: ['ui', 'dark'] });

      index.addEntry(old);
      index.updateEntry(old, updated);

      expect(index.getByTag('ui').has('e1')).toBe(true);
      expect(index.getByTag('dark').has('e1')).toBe(true);
    });

    it('should handle type change', () => {
      const old = makeEntry({ id: 'e1', type: 'user', key: 'pref', tags: [] });
      const updated = makeEntry({ id: 'e1', type: 'project', key: 'pref', tags: [] });

      index.addEntry(old);
      index.updateEntry(old, updated);

      expect(index.getByType('user').size).toBe(0);
      expect(index.getByType('project').has('e1')).toBe(true);
    });
  });

  describe('query()', () => {
    it('should query by type', () => {
      index.addEntry(makeEntry({ id: 'e1', type: 'user', key: 'a' }));
      index.addEntry(makeEntry({ id: 'e2', type: 'project', key: 'b' }));

      const results = index.query({ type: 'user' });
      expect(results.size).toBe(1);
      expect(results.has('e1')).toBe(true);
    });

    it('should query by key prefix', () => {
      index.addEntry(makeEntry({ id: 'e1', type: 'user', key: 'pref-theme' }));
      index.addEntry(makeEntry({ id: 'e2', type: 'user', key: 'pref-lang' }));
      index.addEntry(makeEntry({ id: 'e3', type: 'user', key: 'other' }));

      const results = index.query({ keyPrefix: 'pref-' });
      expect(results.size).toBe(2);
    });

    it('should query by tags with AND semantics', () => {
      index.addEntry(makeEntry({ id: 'e1', type: 'user', key: 'a', tags: ['ui', 'dark'] }));
      index.addEntry(makeEntry({ id: 'e2', type: 'user', key: 'b', tags: ['ui', 'light'] }));
      index.addEntry(makeEntry({ id: 'e3', type: 'user', key: 'c', tags: ['ui'] }));

      const results = index.query({ tags: ['ui', 'dark'] });
      expect(results.size).toBe(1);
      expect(results.has('e1')).toBe(true);
    });

    it('should query by time range', () => {
      const oldTime = new Date(Date.now() - 100000).toISOString();
      const newTime = new Date().toISOString();

      index.addEntry(makeEntry({ id: 'e1', createdAt: oldTime }));
      index.addEntry(makeEntry({ id: 'e2', createdAt: newTime }));

      const results = index.query({ from: new Date(Date.now() - 50000).toISOString() });
      expect(results.size).toBe(1);
      expect(results.has('e2')).toBe(true);
    });

    it('should combine multiple filters', () => {
      index.addEntry(makeEntry({ id: 'e1', type: 'user', key: 'pref-a', tags: ['ui'] }));
      index.addEntry(makeEntry({ id: 'e2', type: 'user', key: 'pref-b', tags: ['core'] }));
      index.addEntry(makeEntry({ id: 'e3', type: 'project', key: 'pref-c', tags: ['ui'] }));

      const results = index.query({ type: 'user', keyPrefix: 'pref-', tags: ['ui'] });
      expect(results.size).toBe(1);
      expect(results.has('e1')).toBe(true);
    });
  });

  describe('removeByType()', () => {
    it('should remove all entries of a type from all indexes', () => {
      index.addEntry(makeEntry({ id: 'e1', type: 'user', key: 'a', tags: ['ui'] }));
      index.addEntry(makeEntry({ id: 'e2', type: 'user', key: 'b', tags: ['core'] }));
      index.addEntry(makeEntry({ id: 'e3', type: 'project', key: 'c', tags: ['ui'] }));

      const removed = index.removeByType('user');

      expect(removed).toHaveLength(2);
      expect(index.getByType('user').size).toBe(0);
      expect(index.getByType('project').size).toBe(1);
      expect(index.getByTag('ui').size).toBe(1); // e3 still has 'ui'
      expect(index.getByTag('core').size).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear all indexes', () => {
      index.addEntry(makeEntry({ id: 'e1', type: 'user', key: 'a', tags: ['ui'] }));
      index.clear();

      expect(index.getByType('user').size).toBe(0);
      expect(index.getByTag('ui').size).toBe(0);
    });
  });

  describe('countByType()', () => {
    it('should count entries per type', () => {
      index.addEntry(makeEntry({ id: 'e1', type: 'user', key: 'a' }));
      index.addEntry(makeEntry({ id: 'e2', type: 'user', key: 'b' }));
      index.addEntry(makeEntry({ id: 'e3', type: 'project', key: 'c' }));

      expect(index.countByType('user')).toBe(2);
      expect(index.countByType('project')).toBe(1);
      expect(index.countByType('bug')).toBe(0);
    });
  });
});

// ─── CompactionEngine Tests ─────────────────────────────────

describe('CompactionEngine', () => {
  let engine: CompactionEngine;

  beforeEach(() => {
    engine = new CompactionEngine({ maxEntriesPerType: 5, compactionThreshold: 20 });
  });

  function makeEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
    return {
      id: overrides.id ?? `mem_${Math.random().toString(36).substring(2, 8)}`,
      type: overrides.type ?? 'user',
      key: overrides.key ?? 'test',
      value: overrides.value ?? 'data',
      tags: overrides.tags ?? [],
      createdAt: overrides.createdAt ?? new Date().toISOString(),
      updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    };
  }

  describe('selectEntriesForCompaction()', () => {
    it('should return empty when under threshold', () => {
      const entries = Array.from({ length: 3 }, (_, i) =>
        makeEntry({ id: `e${i}`, createdAt: new Date(Date.now() + i * 1000).toISOString() })
      );

      const result = engine.selectEntriesForCompaction(entries);
      expect(result.toCompact).toHaveLength(0);
      expect(result.toKeep).toHaveLength(3);
    });

    it('should select oldest entries for compaction when over threshold', () => {
      const entries = Array.from({ length: 8 }, (_, i) =>
        makeEntry({
          id: `e${i}`,
          key: `key-${i}`,
          createdAt: new Date(Date.now() + i * 1000).toISOString(),
        })
      );

      const result = engine.selectEntriesForCompaction(entries, 5);
      expect(result.toCompact.length).toBe(3);
      expect(result.toKeep.length).toBe(5);

      // Oldest entries should be compacted
      expect(result.toCompact[0]!.id).toBe('e0');
      expect(result.toCompact[1]!.id).toBe('e1');
      expect(result.toCompact[2]!.id).toBe('e2');
    });

    it('should keep newest entries', () => {
      const entries = Array.from({ length: 8 }, (_, i) =>
        makeEntry({
          id: `e${i}`,
          key: `key-${i}`,
          createdAt: new Date(Date.now() + i * 1000).toISOString(),
        })
      );

      const result = engine.selectEntriesForCompaction(entries, 5);
      expect(result.toKeep[0]!.id).toBe('e3');
      expect(result.toKeep[result.toKeep.length - 1]!.id).toBe('e7');
    });
  });

  describe('createSummary()', () => {
    it('should create a summary from entries', () => {
      const entries = Array.from({ length: 3 }, (_, i) =>
        makeEntry({
          id: `e${i}`,
          type: 'user',
          key: `key-${i}`,
          tags: ['tag-1'],
          createdAt: new Date(Date.now() + i * 1000).toISOString(),
        })
      );

      const summary = engine.createSummary('user', entries);

      expect(summary.type).toBe('user');
      expect(summary.entryCount).toBe(3);
      expect(summary.keys).toEqual(['key-0', 'key-1', 'key-2']);
      expect(summary.summary).toContain('3');
    });

    it('should throw on empty entries', () => {
      expect(() => engine.createSummary('user', [])).toThrow('Cannot create summary');
    });
  });

  describe('createSummaryEntry()', () => {
    it('should create a valid MemoryEntry with summary', () => {
      const entries = Array.from({ length: 3 }, (_, i) =>
        makeEntry({
          type: 'bug',
          key: `bug-${i}`,
          createdAt: new Date(Date.now() + i * 1000).toISOString(),
        })
      );

      const entry = engine.createSummaryEntry('bug', entries, () => 'summary-id-1');

      expect(entry.id).toBe('summary-id-1');
      expect(entry.type).toBe('bug');
      expect(entry.tags).toContain('__compaction');
      expect(entry.tags).toContain('__summary');
      expect(entry.value.type).toBe('bug');
      expect(entry.value.entryCount).toBe(3);
    });
  });

  describe('needsCompaction()', () => {
    it('should return false when under threshold', () => {
      expect(engine.needsCompaction(10)).toBe(false);
    });

    it('should return true when at or above threshold', () => {
      expect(engine.needsCompaction(20)).toBe(true);
      expect(engine.needsCompaction(25)).toBe(true);
    });
  });

  describe('needsCompactionByType()', () => {
    it('should return false when under per-type threshold', () => {
      expect(engine.needsCompactionByType(3)).toBe(false);
    });

    it('should return true when at or above per-type threshold', () => {
      expect(engine.needsCompactionByType(5)).toBe(true);
    });
  });

  describe('compactAll()', () => {
    it('should compact types that exceed threshold', () => {
      const entriesByType = new Map<MemoryType, MemoryEntry[]>();

      // 8 user entries (exceeds maxEntriesPerType of 5)
      entriesByType.set('user', Array.from({ length: 8 }, (_, i) =>
        makeEntry({
          id: `user-${i}`,
          type: 'user',
          key: `key-${i}`,
          createdAt: new Date(Date.now() + i * 1000).toISOString(),
        })
      ));

      // 2 project entries (under threshold)
      entriesByType.set('project', Array.from({ length: 2 }, (_, i) =>
        makeEntry({
          id: `proj-${i}`,
          type: 'project',
          key: `proj-key-${i}`,
          createdAt: new Date(Date.now() + i * 1000).toISOString(),
        })
      ));

      const { results, summaryEntries, idsToRemove } = engine.compactAll(
        entriesByType,
        () => `summary-${Math.random()}`
      );

      expect(results).toHaveLength(1); // Only user type was compacted
      expect(results[0]!.type).toBe('user');
      expect(results[0]!.compactedCount).toBe(3); // 8 - 5 = 3
      expect(summaryEntries).toHaveLength(1);
      expect(idsToRemove.size).toBe(3);
    });

    it('should not compact types under threshold', () => {
      const entriesByType = new Map<MemoryType, MemoryEntry[]>();
      entriesByType.set('user', Array.from({ length: 3 }, (_, i) =>
        makeEntry({ id: `user-${i}`, type: 'user', key: `key-${i}` })
      ));

      const { results } = engine.compactAll(entriesByType, () => 'summary-1');
      expect(results).toHaveLength(0);
    });
  });
});

// ─── Integration Tests ──────────────────────────────────────

describe('Memory Integration', () => {
  it('should support full lifecycle: store → recall → search → forget', async () => {
    const store = createTestStore();
    const eventBus = new EventBus();
    const events: unknown[] = [];
    eventBus.subscribe('memory.stored', (e) => events.push(e));

    const storeWithBus = createTestStore(undefined, eventBus);

    // Store
    const entry = await storeWithBus.store('project', 'my-project', { name: 'Alpha' }, {
      tags: ['active', 'important'],
    });

    // Recall
    const recalled = await storeWithBus.recall('project', 'my-project');
    expect(recalled!.value).toEqual({ name: 'Alpha' });

    // Search
    const found = await storeWithBus.search({ tags: ['active'] });
    expect(found).toHaveLength(1);

    // Forget
    const forgot = await storeWithBus.forget(entry.id);
    expect(forgot).toBe(true);

    // Verify gone
    const gone = await storeWithBus.recall('project', 'my-project');
    expect(gone).toBeUndefined();

    // Events were emitted
    expect(events.length).toBeGreaterThan(0);
  });

  it('should support export and import round-trip', async () => {
    const store1 = createTestStore();
    await store1.store('user', 'pref-theme', 'dark', { tags: ['ui'] });
    await store1.store('user', 'pref-lang', 'en', { tags: ['i18n'] });
    await store1.store('project', 'proj-1', { name: 'Alpha' });

    const exported = await store1.export();

    const store2 = createTestStore();
    const imported = await store2.import(exported);

    expect(imported).toBe(3);

    const theme = await store2.recall('user', 'pref-theme');
    expect(theme!.value).toBe('dark');

    const searched = await store2.search({ tags: ['ui'] });
    expect(searched).toHaveLength(1);
  });

  it('should handle compaction through MemoryStore.compact()', async () => {
    const store = createTestStore({
      maxEntriesPerType: 3,
      compactionThreshold: 5,
    });

    for (let i = 0; i < 6; i++) {
      await store.store('user', `key-${i}`, `value-${i}`, { tags: ['test'] });
    }

    const results = await store.compact('user');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.compactedCount).toBe(3); // 6 - 3 = 3

    // Newest entries should still be accessible
    const newest = await store.recall('user', 'key-5');
    expect(newest).toBeDefined();
    expect(newest!.value).toBe('value-5');

    // Stats should show reduced count
    const stats = await store.getStats();
    // Should have 3 kept + 1 summary = 4
    expect(stats.entriesByType.user).toBe(4);
  });

  it('should handle concurrent operations', async () => {
    const store = createTestStore();

    // Concurrent stores
    const promises = Array.from({ length: 10 }, (_, i) =>
      store.store('user', `concurrent-${i}`, `value-${i}`)
    );

    const entries = await Promise.all(promises);
    expect(entries).toHaveLength(10);

    const stats = await store.getStats();
    expect(stats.totalEntries).toBe(10);
  });
});
