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
export { DAGRuntime, validateDAG, computeExecutionLayers } from './dag-runtime.js';
export { TaskExecutor } from './task-executor.js';
export { QualityGateRunner } from './quality-gates.js';
export { CheckpointManager, InMemoryCheckpointStore } from './checkpoint.js';
export { WorkflowManager } from './workflow-manager.js';
export type { WorkflowId, NodeId, WorkflowStatus, NodeStatus, NodeType, DAGNode, DAGEdge, DAGDefinition, NodeResult, WorkflowExecution, SerializedExecution, RetryPolicy, QualityGateOnFailure, QualityGateConfig, QualityGateResult, QualityGateValidator, WorkflowCheckpoint, TaskContext, TaskHandler, WorkflowStartedPayload, WorkflowCompletedPayload, WorkflowFailedPayload, NodeStartedPayload, NodeCompletedPayload, CheckpointSavedPayload, QualityFailedPayload, DAGValidationResult, WorkflowTemplate, WorkflowEngineConfig, } from './types.js';
export type { CheckpointStore } from './checkpoint.js';
//# sourceMappingURL=index.d.ts.map