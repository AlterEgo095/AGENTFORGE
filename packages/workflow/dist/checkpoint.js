/**
 * ALTER EGO OS — Checkpoint Manager
 *
 * Save and restore workflow execution state.
 * Checkpoints are persisted after each node completes,
 * enabling resume-from-failure and pause/resume workflows.
 */
// ─── In-Memory Checkpoint Store ──────────────────────────────
export class InMemoryCheckpointStore {
    checkpoints = new Map();
    async save(checkpoint) {
        this.checkpoints.set(checkpoint.executionId, checkpoint);
    }
    async load(executionId) {
        return this.checkpoints.get(executionId) ?? null;
    }
    async remove(executionId) {
        this.checkpoints.delete(executionId);
    }
    async list(dagId) {
        const all = Array.from(this.checkpoints.values());
        if (dagId) {
            return all.filter((cp) => cp.dagId === dagId);
        }
        return all;
    }
}
// ─── Checkpoint Manager ──────────────────────────────────────
export class CheckpointManager {
    store;
    constructor(store = new InMemoryCheckpointStore()) {
        this.store = store;
    }
    /**
     * Create a checkpoint from the current execution state.
     */
    createCheckpoint(execution) {
        const completedNodes = [];
        const nodeResults = {};
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
    async save(checkpoint) {
        await this.store.save(checkpoint);
    }
    /**
     * Save a checkpoint directly from an execution.
     */
    async saveExecution(execution) {
        const checkpoint = this.createCheckpoint(execution);
        await this.store.save(checkpoint);
        return checkpoint;
    }
    /**
     * Load a checkpoint by execution ID.
     */
    async load(executionId) {
        return this.store.load(executionId);
    }
    /**
     * Remove a checkpoint.
     */
    async remove(executionId) {
        await this.store.remove(executionId);
    }
    /**
     * List all checkpoints, optionally filtered by DAG ID.
     */
    async list(dagId) {
        return this.store.list(dagId);
    }
    /**
     * Restore a WorkflowExecution from a checkpoint.
     * Rebuilds the Map-based execution from the serialized checkpoint.
     */
    restoreFromCheckpoint(checkpoint) {
        const nodeResults = new Map();
        for (const [nodeId, result] of Object.entries(checkpoint.nodeResults)) {
            nodeResults.set(nodeId, result);
        }
        return {
            id: checkpoint.executionId,
            dagId: checkpoint.dagId,
            status: 'paused',
            input: checkpoint.input,
            nodeResults,
            startedAt: checkpoint.timestamp,
            error: undefined,
        };
    }
}
//# sourceMappingURL=checkpoint.js.map