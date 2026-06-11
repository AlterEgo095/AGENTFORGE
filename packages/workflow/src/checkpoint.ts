/**
 * ALTER EGO OS — Checkpoint Manager
 *
 * Save and restore workflow execution state.
 * Checkpoints are persisted after each node completes,
 * enabling resume-from-failure and pause/resume workflows.
 */

import type {
  NodeId,
  NodeResult,
  WorkflowCheckpoint,
  WorkflowExecution,
  WorkflowId,
  WorkflowStatus,
} from './types.js';

// ─── Checkpoint Store Interface ──────────────────────────────

/**
 * Abstract storage backend for checkpoints.
 * Implement this to persist checkpoints to disk, database, etc.
 */
export interface CheckpointStore {
  save(checkpoint: WorkflowCheckpoint): Promise<void>;
  load(executionId: string): Promise<WorkflowCheckpoint | null>;
  remove(executionId: string): Promise<void>;
  list(dagId?: WorkflowId): Promise<WorkflowCheckpoint[]>;
}

// ─── In-Memory Checkpoint Store ──────────────────────────────

export class InMemoryCheckpointStore implements CheckpointStore {
  private readonly checkpoints: Map<string, WorkflowCheckpoint> = new Map();

  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    this.checkpoints.set(checkpoint.executionId, checkpoint);
  }

  async load(executionId: string): Promise<WorkflowCheckpoint | null> {
    return this.checkpoints.get(executionId) ?? null;
  }

  async remove(executionId: string): Promise<void> {
    this.checkpoints.delete(executionId);
  }

  async list(dagId?: WorkflowId): Promise<WorkflowCheckpoint[]> {
    const all = Array.from(this.checkpoints.values());
    if (dagId) {
      return all.filter((cp) => cp.dagId === dagId);
    }
    return all;
  }
}

// ─── Checkpoint Manager ──────────────────────────────────────

export class CheckpointManager {
  constructor(private readonly store: CheckpointStore = new InMemoryCheckpointStore()) {}

  /**
   * Create a checkpoint from the current execution state.
   */
  createCheckpoint(execution: WorkflowExecution): WorkflowCheckpoint {
    const completedNodes: NodeId[] = [];
    const nodeResults: Record<NodeId, NodeResult> = {};

    for (const [nodeId, result] of execution.nodeResults) {
      nodeResults[nodeId] = result;
      if (result.status === 'completed' || result.status === 'skipped') {
        completedNodes.push(nodeId);
      }
    }

    return {
      executionId: execution.id,
      dagId: execution.dagId,
      status: execution.status,
      completedNodes,
      nodeResults,
      timestamp: new Date().toISOString(),
      input: execution.input,
    };
  }

  /**
   * Save a checkpoint to the store.
   */
  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    await this.store.save(checkpoint);
  }

  /**
   * Save a checkpoint directly from an execution.
   */
  async saveExecution(execution: WorkflowExecution): Promise<WorkflowCheckpoint> {
    const checkpoint = this.createCheckpoint(execution);
    await this.store.save(checkpoint);
    return checkpoint;
  }

  /**
   * Load a checkpoint by execution ID.
   */
  async load(executionId: string): Promise<WorkflowCheckpoint | null> {
    return this.store.load(executionId);
  }

  /**
   * Remove a checkpoint.
   */
  async remove(executionId: string): Promise<void> {
    await this.store.remove(executionId);
  }

  /**
   * List all checkpoints, optionally filtered by DAG ID.
   */
  async list(dagId?: WorkflowId): Promise<WorkflowCheckpoint[]> {
    return this.store.list(dagId);
  }

  /**
   * Restore a WorkflowExecution from a checkpoint.
   * Rebuilds the Map-based execution from the serialized checkpoint.
   */
  restoreFromCheckpoint(checkpoint: WorkflowCheckpoint): WorkflowExecution {
    const nodeResults = new Map<NodeId, NodeResult>();
    for (const [nodeId, result] of Object.entries(checkpoint.nodeResults)) {
      nodeResults.set(nodeId, result);
    }

    return {
      id: checkpoint.executionId,
      dagId: checkpoint.dagId,
      status: 'paused' as WorkflowStatus,
      input: checkpoint.input,
      nodeResults,
      startedAt: checkpoint.timestamp,
      error: undefined,
    };
  }
}
