/**
 * ALTER EGO OS — Checkpoint Manager
 *
 * Manages workflow/mission state persistence and recovery using a pluggable
 * CheckpointStore. Emits events through the EventBus for observability.
 */

import type { EventBus } from '@alterego/event-bus';
import type {
  CheckpointId,
  Checkpoint,
  CheckpointStore,
  CheckpointSavedEvent,
  CheckpointRestoredEvent,
  CheckpointCleanedUpEvent,
} from './types.js';
import { InMemoryCheckpointStore } from './stores/in-memory.js';

// ─── Checkpoint Manager ───────────────────────────────────────

export class CheckpointManager {
  private store: CheckpointStore;
  private readonly eventBus?: EventBus;

  constructor(store?: CheckpointStore, eventBus?: EventBus) {
    this.store = store ?? new InMemoryCheckpointStore();
    this.eventBus = eventBus;
  }

  // ─── Save ───────────────────────────────────────────────

  /**
   * Save a checkpoint for a workflow.
   * Generates a unique ID and timestamp automatically.
   */
  async save(
    workflowId: string,
    state: {
      missionId?: string;
      status: string;
      completedSteps: string[];
      stepResults: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      id: this.generateCheckpointId(),
      workflowId,
      missionId: state.missionId,
      status: state.status,
      completedSteps: state.completedSteps,
      stepResults: state.stepResults,
      createdAt: new Date().toISOString(),
      metadata: state.metadata,
    };

    await this.store.save(checkpoint);

    // Emit event
    if (this.eventBus) {
      this.eventBus
        .emit({
          type: 'checkpoint.saved',
          payload: {
            checkpointId: checkpoint.id,
            workflowId: checkpoint.workflowId,
            missionId: checkpoint.missionId,
            status: checkpoint.status,
            completedStepsCount: checkpoint.completedSteps.length,
          } satisfies CheckpointSavedEvent,
          source: 'checkpoint',
        })
        .catch(() => {});
    }

    return checkpoint;
  }

  // ─── Restore ────────────────────────────────────────────

  /**
   * Restore from a checkpoint by ID.
   * Returns null if the checkpoint is not found.
   */
  async restore(checkpointId: CheckpointId): Promise<Checkpoint | null> {
    const checkpoint = await this.store.load(checkpointId);
    if (!checkpoint) return null;

    // Emit event
    if (this.eventBus) {
      this.eventBus
        .emit({
          type: 'checkpoint.restored',
          payload: {
            checkpointId: checkpoint.id,
            workflowId: checkpoint.workflowId,
            status: checkpoint.status,
          } satisfies CheckpointRestoredEvent,
          source: 'checkpoint',
        })
        .catch(() => {});
    }

    return checkpoint;
  }

  // ─── Get Latest ─────────────────────────────────────────

  /**
   * Get the most recent checkpoint for a workflow.
   */
  async getLatest(workflowId: string): Promise<Checkpoint | null> {
    return this.store.loadLatest(workflowId);
  }

  // ─── List Checkpoints ───────────────────────────────────

  /**
   * List all checkpoints for a workflow.
   */
  async listCheckpoints(workflowId: string): Promise<Checkpoint[]> {
    return this.store.list(workflowId);
  }

  // ─── Delete ─────────────────────────────────────────────

  /**
   * Delete a checkpoint by ID.
   */
  async delete(checkpointId: CheckpointId): Promise<void> {
    return this.store.delete(checkpointId);
  }

  // ─── Cleanup ────────────────────────────────────────────

  /**
   * Remove checkpoints older than the given date.
   * Returns the number of checkpoints deleted.
   */
  async cleanup(olderThan: string): Promise<number> {
    const count = await this.store.cleanup(olderThan);

    // Emit event
    if (this.eventBus && count > 0) {
      this.eventBus
        .emit({
          type: 'checkpoint.cleanedUp',
          payload: {
            deletedCount: count,
            beforeDate: olderThan,
          } satisfies CheckpointCleanedUpEvent,
          source: 'checkpoint',
        })
        .catch(() => {});
    }

    return count;
  }

  // ─── Set Store ──────────────────────────────────────────

  /**
   * Change the storage backend.
   * This replaces the current store — existing in-memory data will be lost.
   */
  setStore(store: CheckpointStore): void {
    this.store = store;
  }

  // ─── Private ────────────────────────────────────────────

  private generateCheckpointId(): CheckpointId {
    return `cp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
