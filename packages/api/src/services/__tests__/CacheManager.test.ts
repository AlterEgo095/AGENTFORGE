// ============================================================
// AgentForge - CacheManager Unit Tests
// Tests for L1/L2 cache, SHA-256 key generation, LRU eviction,
// cache stats, and namespaced clear (SCAN+DEL, not flushdb)
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheManager } from '../CacheManager';

// Mock env module
vi.mock('../../config/env', () => ({
  env: {
    REDIS_URL: 'redis://localhost:6379',
    NODE_ENV: 'test',
  },
}));

// Mock telemetry
vi.mock('../telemetry/TracingService', () => ({
  tracingService: {
    isEnabled: () => false,
    addEvent: vi.fn(),
    withSpan: vi.fn((_opts: any, fn: any) => fn({ setAttribute: vi.fn() })),
  },
}));

vi.mock('../telemetry/MetricsService', () => ({
  metricsService: {
    isEnabled: () => false,
    recordLLMCallDuration: vi.fn(),
    recordTokenUsage: vi.fn(),
  },
}));

vi.mock('../telemetry/AlertManager', () => ({
  alertManager: {
    getActiveAlerts: vi.fn().mockReturnValue([]),
    getRules: vi.fn().mockReturnValue([]),
    evaluateMetric: vi.fn(),
  },
}));

// Mock RedisManager with controllable scanStream spy
const mockScanStream = vi.fn(() => {
  const handlers: Record<string, Function[]> = {};
  const streamObj = {
    on: vi.fn((event: string, cb: Function) => {
      (handlers[event] ??= []).push(cb);
      // Immediately emit 'end' for tests so clear() completes
      if (event === 'end') setTimeout(() => cb(), 0);
      if (event === 'data') setTimeout(() => cb(['agentforge:cache:test-key']), 0);
      return streamObj;
    }),
  };
  return streamObj;
});

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  incr: vi.fn().mockResolvedValue(1),
  pexpire: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
  scanStream: mockScanStream,
  pipeline: vi.fn(() => ({
    del: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  })),
  ping: vi.fn().mockResolvedValue('PONG'),
  quit: vi.fn().mockResolvedValue('OK'),
  on: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../RedisManager', () => ({
  getPrimaryRedis: vi.fn(() => mockRedis),
  isRedisAvailable: vi.fn(() => false), // L2 unavailable for unit tests
  closeAllRedisConnections: vi.fn().mockResolvedValue(undefined),
  getRedisStats: vi.fn(() => ({ primaryReady: false, subscriberReady: false })),
}));

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
    // Clear the L1 cache between tests since CacheManager is a singleton
    const l1Cache = (cache as any).l1Cache as Map<string, any>;
    l1Cache.clear();
  });

  // ═══════════════════════════════════════════════════════
  // Singleton Pattern
  // ═══════════════════════════════════════════════════════

  describe('singleton pattern', () => {
    it('should return the same instance on multiple constructions', () => {
      const c1 = new CacheManager();
      const c2 = new CacheManager();
      expect(c1).toBe(c2);
    });
  });

  // ═══════════════════════════════════════════════════════
  // L1 Cache - Get/Set
  // ═══════════════════════════════════════════════════════

  describe('L1 cache get/set', () => {
    it('should store and retrieve a value from L1 cache', async () => {
      await cache.set('agent-1', 'test prompt', { output: 'test output' });
      const result = await cache.get('agent-1', 'test prompt');

      expect(result).not.toBeNull();
      expect(result!.output).toBe('test output');
      expect(result!.agentId).toBe('agent-1');
    });

    it('should return null for cache miss', async () => {
      const result = await cache.get('non-existent-agent', 'non-existent prompt');
      expect(result).toBeNull();
    });

    it('should increment hit count on each get', async () => {
      await cache.set('agent-1', 'prompt', { output: 'output' });

      await cache.get('agent-1', 'prompt'); // hits = 1
      await cache.get('agent-1', 'prompt'); // hits = 2
      await cache.get('agent-1', 'prompt'); // hits = 3

      const result = await cache.get('agent-1', 'prompt'); // hits = 4
      expect(result!.hits).toBe(4);
    });

    it('should differentiate between different prompts for same agent', async () => {
      await cache.set('agent-1', 'prompt A', { output: 'output A' });
      await cache.set('agent-1', 'prompt B', { output: 'output B' });

      const resultA = await cache.get('agent-1', 'prompt A');
      const resultB = await cache.get('agent-1', 'prompt B');

      expect(resultA!.output).toBe('output A');
      expect(resultB!.output).toBe('output B');
    });

    it('should differentiate between same prompt for different agents', async () => {
      await cache.set('agent-1', 'same prompt', { output: 'output 1' });
      await cache.set('agent-2', 'same prompt', { output: 'output 2' });

      const result1 = await cache.get('agent-1', 'same prompt');
      const result2 = await cache.get('agent-2', 'same prompt');

      expect(result1!.output).toBe('output 1');
      expect(result2!.output).toBe('output 2');
    });
  });

  // ═══════════════════════════════════════════════════════
  // SHA-256 Key Generation
  // ═══════════════════════════════════════════════════════

  describe('SHA-256 key generation', () => {
    it('should generate consistent keys for same input', async () => {
      await cache.set('agent-1', 'test prompt', { output: 'output' });
      const result1 = await cache.get('agent-1', 'test prompt');

      // Clear and re-set with same input
      await cache.invalidate('agent-1', 'test prompt');
      await cache.set('agent-1', 'test prompt', { output: 'output2' });
      const result2 = await cache.get('agent-1', 'test prompt');

      // Both results should have the same promptHash (same key generated)
      expect(result1!.promptHash).toBe(result2!.promptHash);
    });

    it('should generate different keys for different inputs', async () => {
      await cache.set('agent-1', 'prompt A', { output: 'output' });
      await cache.set('agent-1', 'prompt B', { output: 'output' });

      const resultA = await cache.get('agent-1', 'prompt A');
      const resultB = await cache.get('agent-1', 'prompt B');

      expect(resultA!.promptHash).not.toBe(resultB!.promptHash);
    });

    it('should produce 32-character hex keys', async () => {
      await cache.set('agent-1', 'test', { output: 'output' });
      const result = await cache.get('agent-1', 'test');

      expect(result!.promptHash).toHaveLength(32);
      expect(result!.promptHash).toMatch(/^[0-9a-f]+$/);
    });
  });

  // ═══════════════════════════════════════════════════════
  // L1 Cache Invalidation
  // ═══════════════════════════════════════════════════════

  describe('L1 cache invalidation', () => {
    it('should invalidate a specific cache entry', async () => {
      await cache.set('agent-1', 'prompt', { output: 'output' });

      let result = await cache.get('agent-1', 'prompt');
      expect(result).not.toBeNull();

      await cache.invalidate('agent-1', 'prompt');

      result = await cache.get('agent-1', 'prompt');
      expect(result).toBeNull();
    });

    it('should not affect other entries when invalidating', async () => {
      await cache.set('agent-1', 'prompt A', { output: 'A' });
      await cache.set('agent-1', 'prompt B', { output: 'B' });

      await cache.invalidate('agent-1', 'prompt A');

      const resultA = await cache.get('agent-1', 'prompt A');
      const resultB = await cache.get('agent-1', 'prompt B');

      expect(resultA).toBeNull();
      expect(resultB).not.toBeNull();
      expect(resultB!.output).toBe('B');
    });
  });

  // ═══════════════════════════════════════════════════════
  // LRU Eviction
  // ═══════════════════════════════════════════════════════

  describe('LRU eviction', () => {
    it('should evict 10% oldest entries when L1 exceeds max size', async () => {
      // L1_MAX_SIZE = 1000, so we need to add 1001 entries
      // But for testing, we'll fill the cache and verify eviction behavior

      // Add many entries to trigger eviction
      for (let i = 0; i < 1001; i++) {
        await cache.set(`agent-${i % 10}`, `prompt-${i}`, { output: `output-${i}` });
      }

      // After eviction, cache size should be less than L1_MAX_SIZE
      const stats = cache.getStats();
      expect(stats.l1Size).toBeLessThanOrEqual(1000);
    });

    it('should evict oldest entries first (LRU)', async () => {
      // Add entries in order
      await cache.set('agent', 'prompt-0', { output: 'oldest' });

      // Fill up cache to trigger eviction
      for (let i = 1; i <= 1001; i++) {
        await cache.set('agent', `prompt-${i}`, { output: `output-${i}` });
      }

      // The oldest entry should have been evicted
      const oldestResult = await cache.get('agent', 'prompt-0');
      expect(oldestResult).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════
  // Cache Stats
  // ═══════════════════════════════════════════════════════

  describe('cache stats', () => {
    it('should return empty stats for fresh cache', () => {
      const stats = cache.getStats();
      expect(stats.l1Size).toBe(0);
      expect(stats.l1HitRate).toBe(0);
    });

    it('should track L1 cache size', async () => {
      await cache.set('agent-1', 'prompt-1', { output: 'output-1' });
      expect(cache.getStats().l1Size).toBe(1);

      await cache.set('agent-1', 'prompt-2', { output: 'output-2' });
      expect(cache.getStats().l1Size).toBe(2);
    });

    it('should calculate L1 hit rate', async () => {
      await cache.set('agent-1', 'prompt', { output: 'output' });

      // Access the entry multiple times to increase hits
      await cache.get('agent-1', 'prompt');
      await cache.get('agent-1', 'prompt');
      await cache.get('agent-1', 'prompt');

      const stats = cache.getStats();
      expect(stats.l1HitRate).toBeGreaterThan(0);
      // l1HitRate = totalHits / l1Size. After 3 gets, entry has 3 hits. 3/1 = 3.0
      expect(stats.l1HitRate).toBe(3);
    });

    it('should decrease size on invalidation', async () => {
      await cache.set('agent-1', 'prompt-1', { output: 'output-1' });
      await cache.set('agent-1', 'prompt-2', { output: 'output-2' });
      expect(cache.getStats().l1Size).toBe(2);

      await cache.invalidate('agent-1', 'prompt-1');
      expect(cache.getStats().l1Size).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Clear with Namespace (SCAN+DEL, not flushdb)
  // ═══════════════════════════════════════════════════════

  describe('clear with namespace', () => {
    it('should clear all L1 entries', async () => {
      await cache.set('agent-1', 'prompt-1', { output: 'output-1' });
      await cache.set('agent-2', 'prompt-2', { output: 'output-2' });

      expect(cache.getStats().l1Size).toBe(2);

      await cache.clear();

      expect(cache.getStats().l1Size).toBe(0);
    });

    it('should result in cache misses after clear', async () => {
      await cache.set('agent-1', 'prompt', { output: 'output' });
      await cache.clear();

      const result = await cache.get('agent-1', 'prompt');
      expect(result).toBeNull();
    });

    it('should use SCAN+DEL pattern (not flushdb) for Redis clear', async () => {
      // Enable Redis for this test
      const { isRedisAvailable } = await import('../RedisManager');
      (isRedisAvailable as any).mockReturnValue(true);

      await cache.clear();

      // Verify scanStream was called (SCAN pattern) rather than flushdb
      expect(mockScanStream).toHaveBeenCalledWith({
        match: 'agentforge:cache:*',
        count: 100,
      });

      // Verify flushdb was NOT called (our mock doesn't have flushdb)
      expect((mockRedis as any).flushdb).toBeUndefined();

      // Restore
      (isRedisAvailable as any).mockReturnValue(false);
    });

    it('should only delete keys with AgentForge namespace', async () => {
      // Enable Redis for this test
      const { isRedisAvailable } = await import('../RedisManager');
      (isRedisAvailable as any).mockReturnValue(true);

      await cache.clear();

      // Verify scanStream match pattern uses our namespace prefix
      expect(mockScanStream).toHaveBeenCalledWith(
        expect.objectContaining({
          match: expect.stringContaining('agentforge:cache:'),
        })
      );

      // Restore
      (isRedisAvailable as any).mockReturnValue(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // L1 TTL Expiration
  // ═══════════════════════════════════════════════════════

  describe('L1 TTL expiration', () => {
    it('should expire L1 entries after TTL', async () => {
      await cache.set('agent-1', 'prompt', { output: 'output' });

      // Manually expire the entry by setting timestamp in the past
      const l1Cache = (cache as any).l1Cache as Map<string, any>;
      for (const [key, entry] of l1Cache.entries()) {
        entry.timestamp = Date.now() - 301 * 1000; // 301 seconds ago (L1_TTL = 300)
      }

      const result = await cache.get('agent-1', 'prompt');
      expect(result).toBeNull();
    });
  });
});
