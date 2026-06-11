/**
 * ALTER EGO OS — In-Memory Checkpoint Store
 *
 * Default in-memory implementation of the CheckpointStore interface.
 * Suitable for Phase 1 and testing. Data is lost on process restart.
 */

import type { Checkpoint, CheckpointId, CheckpointStore } from '../types.js';

export class InMemoryCheckpointStore implements CheckpointStore {
  private readonly checkpoints: Map<CheckpointId, Checkpoint> = new Map();
  private insertionOrder: CheckpointId[] = [];

  async save(checkpoint: Checkpoint): Promise<void> {
    if (!this.checkpoints.has(checkpoint.id)) {
      this.insertionOrder.push(checkpoint.id);
    }
    this.checkpoints.set(checkpoint.id, { ...checkpoint }); // shallow clone
  }

  async load(id: CheckpointId): Promise<Checkpoint | null> {
    const cp = this.checkpoints.get(id);
    return cp ? { ...cp } : null; // return a copy
  }

  async loadLatest(workflowId: string): Promise<Checkpoint | null> {
    // Iterate in reverse insertion order to find the most recently saved
    for (let i = this.insertionOrder.length - 1; i >= 0; i--) {
      const id = this.insertionOrder[i]!;
      const cp = this.checkpoints.get(id);
      if (cp && cp.workflowId === workflowId) {
        return { ...cp };
      }
    }
    return null;
  }

  async list(workflowId: string): Promise<Checkpoint[]> {
    const results: Checkpoint[] = [];
    for (const cp of this.checkpoints.values()) {
      if (cp.workflowId === workflowId) {
        results.push({ ...cp }); // return copies
      }
    }
    // Sort by createdAt ascending (oldest first)
    results.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return results;
  }

  async delete(id: CheckpointId): Promise<void> {
    this.checkpoints.delete(id);
    this.insertionOrder = this.insertionOrder.filter((cid) => cid !== id);
  }

  async cleanup(beforeDate: string): Promise<number> {
    const cutoff = new Date(beforeDate).getTime();
    let deletedCount = 0;

    for (const [id, cp] of this.checkpoints) {
      if (new Date(cp.createdAt).getTime() < cutoff) {
        this.checkpoints.delete(id);
        this.insertionOrder = this.insertionOrder.filter((cid) => cid !== id);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}
