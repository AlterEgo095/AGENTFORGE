/**
 * ALTER EGO OS — Checkpoint Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CheckpointManager, InMemoryCheckpointStore } from '../index.js';
import type { Checkpoint, CheckpointStore } from '../types.js';

// ─── Custom Store for setStore tests ──────────────────────────

class MockStore implements CheckpointStore {
  public saved: Checkpoint[] = [];

  async save(checkpoint: Checkpoint): Promise<void> {
    this.saved.push(checkpoint);
  }

  async load(id: string): Promise<Checkpoint | null> {
    return this.saved.find((c) => c.id === id) ?? null;
  }

  async loadLatest(workflowId: string): Promise<Checkpoint | null> {
    const filtered = this.saved.filter((c) => c.workflowId === workflowId);
    if (filtered.length === 0) return null;
    return filtered[filtered.length - 1]!;
  }

  async list(workflowId: string): Promise<Checkpoint[]> {
    return this.saved.filter((c) => c.workflowId === workflowId);
  }

  async delete(id: string): Promise<void> {
    this.saved = this.saved.filter((c) => c.id !== id);
  }

  async cleanup(beforeDate: string): Promise<number> {
    const cutoff = new Date(beforeDate).getTime();
    const before = this.saved.length;
    this.saved = this.saved.filter((c) => new Date(c.createdAt).getTime() >= cutoff);
    return before - this.saved.length;
  }
}

// ─── Tests ────────────────────────────────────────────────────

describe('CheckpointManager', () => {
  let manager: CheckpointManager;

  beforeEach(() => {
    manager = new CheckpointManager();
  });

  // ─── Save ───────────────────────────────────────────────

  describe('save', () => {
    it('should save a checkpoint and return it with generated ID and timestamp', async () => {
      const cp = await manager.save('wf-1', {
        status: 'running',
        completedSteps: ['step-1', 'step-2'],
        stepResults: { 'step-1': { output: 'done' }, 'step-2': { output: 'also done' } },
      });

      expect(cp.id).toMatch(/^cp_/);
      expect(cp.workflowId).toBe('wf-1');
      expect(cp.status).toBe('running');
      expect(cp.completedSteps).toEqual(['step-1', 'step-2']);
      expect(cp.stepResults).toEqual({ 'step-1': { output: 'done' }, 'step-2': { output: 'also done' } });
      expect(cp.createdAt).toBeTruthy();
      expect(new Date(cp.createdAt).getTime()).not.toBeNaN();
    });

    it('should save a checkpoint with missionId', async () => {
      const cp = await manager.save('wf-1', {
        missionId: 'mission-42',
        status: 'paused',
        completedSteps: [],
        stepResults: {},
      });

      expect(cp.missionId).toBe('mission-42');
    });

    it('should save a checkpoint with metadata', async () => {
      const cp = await manager.save('wf-1', {
        status: 'running',
        completedSteps: ['step-1'],
        stepResults: {},
        metadata: { retries: 3, lastError: 'timeout' },
      });

      expect(cp.metadata).toEqual({ retries: 3, lastError: 'timeout' });
    });

    it('should generate unique IDs for each checkpoint', async () => {
      const cp1 = await manager.save('wf-1', { status: 'running', completedSteps: [], stepResults: {} });
      const cp2 = await manager.save('wf-1', { status: 'running', completedSteps: [], stepResults: {} });
      expect(cp1.id).not.toBe(cp2.id);
    });
  });

  // ─── Restore ────────────────────────────────────────────

  describe('restore', () => {
    it('should restore a previously saved checkpoint', async () => {
      const saved = await manager.save('wf-1', {
        status: 'paused',
        completedSteps: ['step-1'],
        stepResults: { 'step-1': { data: 42 } },
      });

      const restored = await manager.restore(saved.id);
      expect(restored).not.toBeNull();
      expect(restored!.id).toBe(saved.id);
      expect(restored!.workflowId).toBe('wf-1');
      expect(restored!.status).toBe('paused');
      expect(restored!.completedSteps).toEqual(['step-1']);
      expect(restored!.stepResults).toEqual({ 'step-1': { data: 42 } });
    });

    it('should return null for non-existent checkpoint', async () => {
      const result = await manager.restore('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ─── Get Latest ─────────────────────────────────────────

  describe('getLatest', () => {
    it('should return the most recent checkpoint for a workflow', async () => {
      await manager.save('wf-1', {
        status: 'running',
        completedSteps: ['step-1'],
        stepResults: {},
      });

      // Add a small delay so timestamps differ
      await new Promise((r) => setTimeout(r, 10));

      const latest = await manager.save('wf-1', {
        status: 'completed',
        completedSteps: ['step-1', 'step-2'],
        stepResults: {},
      });

      const result = await manager.getLatest('wf-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe(latest.id);
      expect(result!.status).toBe('completed');
    });

    it('should return null when no checkpoints exist for a workflow', async () => {
      const result = await manager.getLatest('nonexistent');
      expect(result).toBeNull();
    });

    it('should not mix checkpoints from different workflows', async () => {
      await manager.save('wf-1', {
        status: 'running',
        completedSteps: ['a'],
        stepResults: {},
      });

      await manager.save('wf-2', {
        status: 'completed',
        completedSteps: ['b'],
        stepResults: {},
      });

      const latest1 = await manager.getLatest('wf-1');
      const latest2 = await manager.getLatest('wf-2');

      expect(latest1!.workflowId).toBe('wf-1');
      expect(latest2!.workflowId).toBe('wf-2');
    });
  });

  // ─── List Checkpoints ───────────────────────────────────

  describe('listCheckpoints', () => {
    it('should list all checkpoints for a workflow', async () => {
      await manager.save('wf-1', { status: 'running', completedSteps: ['a'], stepResults: {} });
      await manager.save('wf-1', { status: 'paused', completedSteps: ['a', 'b'], stepResults: {} });
      await manager.save('wf-2', { status: 'completed', completedSteps: ['x'], stepResults: {} });

      const list = await manager.listCheckpoints('wf-1');
      expect(list).toHaveLength(2);
      expect(list.every((cp) => cp.workflowId === 'wf-1')).toBe(true);
    });

    it('should return empty array for workflow with no checkpoints', async () => {
      const list = await manager.listCheckpoints('nonexistent');
      expect(list).toEqual([]);
    });

    it('should return checkpoints in chronological order', async () => {
      const cp1 = await manager.save('wf-1', { status: 'running', completedSteps: [], stepResults: {} });
      await new Promise((r) => setTimeout(r, 10));
      const cp2 = await manager.save('wf-1', { status: 'running', completedSteps: ['a'], stepResults: {} });

      const list = await manager.listCheckpoints('wf-1');
      expect(list[0]!.id).toBe(cp1.id);
      expect(list[1]!.id).toBe(cp2.id);
    });
  });

  // ─── Delete ─────────────────────────────────────────────

  describe('delete', () => {
    it('should delete a checkpoint', async () => {
      const cp = await manager.save('wf-1', { status: 'running', completedSteps: [], stepResults: {} });
      await manager.delete(cp.id);
      const restored = await manager.restore(cp.id);
      expect(restored).toBeNull();
    });
  });

  // ─── Cleanup ────────────────────────────────────────────

  describe('cleanup', () => {
    it('should remove checkpoints older than the given date', async () => {
      // Save a checkpoint
      await manager.save('wf-1', { status: 'running', completedSteps: [], stepResults: {} });

      // Cleanup with a date far in the future — should delete it
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const deleted = await manager.cleanup(futureDate);
      expect(deleted).toBe(1);

      const list = await manager.listCheckpoints('wf-1');
      expect(list).toHaveLength(0);
    });

    it('should NOT remove checkpoints newer than the cutoff', async () => {
      await manager.save('wf-1', { status: 'running', completedSteps: [], stepResults: {} });

      // Cleanup with a date far in the past — should NOT delete
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const deleted = await manager.cleanup(pastDate);
      expect(deleted).toBe(0);

      const list = await manager.listCheckpoints('wf-1');
      expect(list).toHaveLength(1);
    });

    it('should return 0 when no checkpoints are old enough', async () => {
      const deleted = await manager.cleanup(new Date().toISOString());
      expect(deleted).toBe(0);
    });
  });

  // ─── Set Store ──────────────────────────────────────────

  describe('setStore', () => {
    it('should switch to a different store backend', async () => {
      // Save with default store
      const cp1 = await manager.save('wf-1', { status: 'running', completedSteps: [], stepResults: {} });

      // Switch to a new mock store
      const newStore = new MockStore();
      manager.setStore(newStore);

      // Old data should not be accessible
      const restored = await manager.restore(cp1.id);
      expect(restored).toBeNull();

      // Save to new store
      const cp2 = await manager.save('wf-2', { status: 'completed', completedSteps: ['x'], stepResults: {} });
      expect(newStore.saved).toHaveLength(1);
      expect(newStore.saved[0]!.id).toBe(cp2.id);
    });
  });

  // ─── InMemoryCheckpointStore Direct Tests ───────────────

  describe('InMemoryCheckpointStore', () => {
    let store: InMemoryCheckpointStore;

    beforeEach(() => {
      store = new InMemoryCheckpointStore();
    });

    it('should save and load a checkpoint', async () => {
      const cp: Checkpoint = {
        id: 'cp-test',
        workflowId: 'wf-1',
        status: 'running',
        completedSteps: ['step-1'],
        stepResults: { 'step-1': 'result' },
        createdAt: new Date().toISOString(),
      };

      await store.save(cp);
      const loaded = await store.load('cp-test');
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe('cp-test');
    });

    it('should return null for non-existent checkpoint', async () => {
      const loaded = await store.load('nonexistent');
      expect(loaded).toBeNull();
    });

    it('should overwrite on save with same ID', async () => {
      const cp: Checkpoint = {
        id: 'cp-dup',
        workflowId: 'wf-1',
        status: 'running',
        completedSteps: [],
        stepResults: {},
        createdAt: new Date().toISOString(),
      };

      await store.save(cp);
      await store.save({ ...cp, status: 'completed', completedSteps: ['a'] });

      const loaded = await store.load('cp-dup');
      expect(loaded!.status).toBe('completed');
    });

    it('should list checkpoints for a workflow', async () => {
      await store.save({ id: 'cp-1', workflowId: 'wf-1', status: 'running', completedSteps: [], stepResults: {}, createdAt: new Date().toISOString() });
      await store.save({ id: 'cp-2', workflowId: 'wf-1', status: 'running', completedSteps: [], stepResults: {}, createdAt: new Date().toISOString() });
      await store.save({ id: 'cp-3', workflowId: 'wf-2', status: 'running', completedSteps: [], stepResults: {}, createdAt: new Date().toISOString() });

      const list = await store.list('wf-1');
      expect(list).toHaveLength(2);
    });

    it('should loadLatest for a workflow', async () => {
      await store.save({ id: 'cp-1', workflowId: 'wf-1', status: 'running', completedSteps: [], stepResults: {}, createdAt: new Date('2024-01-01').toISOString() });
      await store.save({ id: 'cp-2', workflowId: 'wf-1', status: 'completed', completedSteps: [], stepResults: {}, createdAt: new Date('2024-01-02').toISOString() });

      const latest = await store.loadLatest('wf-1');
      expect(latest).not.toBeNull();
      expect(latest!.id).toBe('cp-2');
    });

    it('should delete a checkpoint', async () => {
      await store.save({ id: 'cp-1', workflowId: 'wf-1', status: 'running', completedSteps: [], stepResults: {}, createdAt: new Date().toISOString() });
      await store.delete('cp-1');
      const loaded = await store.load('cp-1');
      expect(loaded).toBeNull();
    });

    it('should cleanup old checkpoints', async () => {
      await store.save({ id: 'old', workflowId: 'wf-1', status: 'running', completedSteps: [], stepResults: {}, createdAt: new Date('2020-01-01').toISOString() });
      await store.save({ id: 'new', workflowId: 'wf-1', status: 'running', completedSteps: [], stepResults: {}, createdAt: new Date().toISOString() });

      const deleted = await store.cleanup(new Date('2022-01-01').toISOString());
      expect(deleted).toBe(1);

      const remaining = await store.list('wf-1');
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.id).toBe('new');
    });
  });

  // ─── EventBus Integration ───────────────────────────────

  describe('EventBus integration', () => {
    it('should emit event when checkpoint is saved', async () => {
      const emitMock = vi.fn().mockResolvedValue(0);
      const mockBus = { emit: emitMock } as any;
      const managerWithBus = new CheckpointManager(undefined, mockBus);

      await managerWithBus.save('wf-1', {
        status: 'running',
        completedSteps: ['step-1'],
        stepResults: {},
      });

      expect(emitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'checkpoint.saved',
          source: 'checkpoint',
        })
      );
    });

    it('should emit event when checkpoint is restored', async () => {
      const emitMock = vi.fn().mockResolvedValue(0);
      const mockBus = { emit: emitMock } as any;
      const managerWithBus = new CheckpointManager(undefined, mockBus);

      const cp = await managerWithBus.save('wf-1', {
        status: 'paused',
        completedSteps: [],
        stepResults: {},
      });

      await managerWithBus.restore(cp.id);

      expect(emitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'checkpoint.restored',
          source: 'checkpoint',
        })
      );
    });

    it('should NOT emit restore event for non-existent checkpoint', async () => {
      const emitMock = vi.fn().mockResolvedValue(0);
      const mockBus = { emit: emitMock } as any;
      const managerWithBus = new CheckpointManager(undefined, mockBus);

      await managerWithBus.restore('nonexistent');

      // Only no event should be emitted for restore of non-existent
      const restoreCalls = emitMock.mock.calls.filter(
        (call: any[]) => call[0]?.type === 'checkpoint.restored'
      );
      expect(restoreCalls).toHaveLength(0);
    });

    it('should emit event when cleanup runs', async () => {
      const emitMock = vi.fn().mockResolvedValue(0);
      const mockBus = { emit: emitMock } as any;
      const managerWithBus = new CheckpointManager(undefined, mockBus);

      await managerWithBus.save('wf-1', { status: 'running', completedSteps: [], stepResults: {} });

      // Cleanup with a date far in the future
      await managerWithBus.cleanup(new Date(Date.now() + 86400000).toISOString());

      expect(emitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'checkpoint.cleanedUp',
          source: 'checkpoint',
        })
      );
    });

    it('should not throw if EventBus emit fails', async () => {
      const failBus = {
        emit: vi.fn().mockRejectedValue(new Error('bus error')),
      } as any;
      const managerWithBus = new CheckpointManager(undefined, failBus);

      // Should NOT throw
      const cp = await managerWithBus.save('wf-1', {
        status: 'running',
        completedSteps: [],
        stepResults: {},
      });
      expect(cp.id).toMatch(/^cp_/);
    });
  });

  // ─── End-to-End: Workflow State Recovery ────────────────

  describe('end-to-end workflow state recovery', () => {
    it('should save and recover full workflow state across multiple steps', async () => {
      // Step 1: Initial state
      const cp1 = await manager.save('wf-e2e', {
        missionId: 'mission-1',
        status: 'running',
        completedSteps: ['step-1'],
        stepResults: { 'step-1': { files: ['a.ts', 'b.ts'] } },
        metadata: { startedAt: '2024-01-01' },
      });

      // Step 2: After more progress
      const cp2 = await manager.save('wf-e2e', {
        missionId: 'mission-1',
        status: 'running',
        completedSteps: ['step-1', 'step-2', 'step-3'],
        stepResults: {
          'step-1': { files: ['a.ts', 'b.ts'] },
          'step-2': { tests: 42, passed: 40 },
          'step-3': { build: 'success' },
        },
      });

      // Step 3: Workflow paused
      const cp3 = await manager.save('wf-e2e', {
        missionId: 'mission-1',
        status: 'paused',
        completedSteps: ['step-1', 'step-2', 'step-3'],
        stepResults: {
          'step-1': { files: ['a.ts', 'b.ts'] },
          'step-2': { tests: 42, passed: 40 },
          'step-3': { build: 'success' },
        },
      });

      // Restore the latest
      const latest = await manager.getLatest('wf-e2e');
      expect(latest).not.toBeNull();
      expect(latest!.id).toBe(cp3.id);
      expect(latest!.status).toBe('paused');
      expect(latest!.completedSteps).toHaveLength(3);

      // Restore a specific earlier checkpoint
      const earlier = await manager.restore(cp1.id);
      expect(earlier).not.toBeNull();
      expect(earlier!.completedSteps).toEqual(['step-1']);

      // List all checkpoints
      const all = await manager.listCheckpoints('wf-e2e');
      expect(all).toHaveLength(3);

      // Cleanup old checkpoints
      const deleted = await manager.cleanup(new Date(Date.now() + 86400000).toISOString());
      expect(deleted).toBe(3);
    });
  });
});
