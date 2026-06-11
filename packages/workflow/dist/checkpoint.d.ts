/**
 * ALTER EGO OS — Checkpoint Manager
 *
 * Save and restore workflow execution state.
 * Checkpoints are persisted after each node completes,
 * enabling resume-from-failure and pause/resume workflows.
 */
import type { WorkflowCheckpoint, WorkflowExecution, WorkflowId } from './types.js';
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
export declare class InMemoryCheckpointStore implements CheckpointStore {
    private readonly checkpoints;
    save(checkpoint: WorkflowCheckpoint): Promise<void>;
    load(executionId: string): Promise<WorkflowCheckpoint | null>;
    remove(executionId: string): Promise<void>;
    list(dagId?: WorkflowId): Promise<WorkflowCheckpoint[]>;
}
export declare class CheckpointManager {
    private readonly store;
    constructor(store?: CheckpointStore);
    /**
     * Create a checkpoint from the current execution state.
     */
    createCheckpoint(execution: WorkflowExecution): WorkflowCheckpoint;
    /**
     * Save a checkpoint to the store.
     */
    save(checkpoint: WorkflowCheckpoint): Promise<void>;
    /**
     * Save a checkpoint directly from an execution.
     */
    saveExecution(execution: WorkflowExecution): Promise<WorkflowCheckpoint>;
    /**
     * Load a checkpoint by execution ID.
     */
    load(executionId: string): Promise<WorkflowCheckpoint | null>;
    /**
     * Remove a checkpoint.
     */
    remove(executionId: string): Promise<void>;
    /**
     * List all checkpoints, optionally filtered by DAG ID.
     */
    list(dagId?: WorkflowId): Promise<WorkflowCheckpoint[]>;
    /**
     * Restore a WorkflowExecution from a checkpoint.
     * Rebuilds the Map-based execution from the serialized checkpoint.
     */
    restoreFromCheckpoint(checkpoint: WorkflowCheckpoint): WorkflowExecution;
}
//# sourceMappingURL=checkpoint.d.ts.map