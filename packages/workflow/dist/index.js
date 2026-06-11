/**
 * ALTER EGO OS — Workflow Engine
 *
 * Public API for the DAG Runtime — the hands of the OS.
 *
 * The Workflow Engine orchestrates task execution according to DAG definitions:
 * - Parallel execution of independent tasks
 * - Sequential execution of dependent tasks
 * - Checkpoint and resume for fault tolerance
 * - Retry with configurable attempts and backoff
 * - Timeout per task
 * - Quality Gate validation after each task
 * - Human approval steps
 * - Workflow templates
 */
// ─── Core Classes ────────────────────────────────────────────
export { DAGRuntime, validateDAG, computeExecutionLayers } from './dag-runtime.js';
export { TaskExecutor } from './task-executor.js';
export { QualityGateRunner } from './quality-gates.js';
export { CheckpointManager, InMemoryCheckpointStore } from './checkpoint.js';
export { WorkflowManager } from './workflow-manager.js';
//# sourceMappingURL=index.js.map