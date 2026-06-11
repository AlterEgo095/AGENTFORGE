/**
 * ALTER EGO OS — Workflow Engine Types
 *
 * Core type definitions for the DAG Runtime — the hands of the OS.
 * Supports: DAG definition, execution, checkpoints, retries, quality gates, approvals.
 */
/** Unique identifier for a workflow definition */
export type WorkflowId = string;
/** Unique identifier for a DAG node */
export type NodeId = string;
/** Overall workflow execution status */
export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
/** Individual node execution status */
export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
/** Types of nodes in the DAG */
export type NodeType = 'task' | 'gateway' | 'approval' | 'parallel' | 'subworkflow';
/** A single node in the DAG */
export interface DAGNode {
    /** Unique node identifier */
    id: NodeId;
    /** Type of node determines execution behavior */
    type: NodeType;
    /** Human-readable name */
    name: string;
    /** Node-type-specific configuration */
    config: Record<string, unknown>;
    /** Timeout in milliseconds (default: 300000 = 5 minutes) */
    timeout?: number;
    /** Retry policy for failed executions */
    retryPolicy?: RetryPolicy;
    /** Quality gate to validate output */
    qualityGate?: QualityGateConfig;
}
/** An edge connecting two nodes in the DAG */
export interface DAGEdge {
    /** Source node */
    from: NodeId;
    /** Target node */
    to: NodeId;
    /** Optional condition expression for conditional edges */
    condition?: string;
}
/** Complete DAG definition */
export interface DAGDefinition {
    /** Unique workflow identifier */
    id: WorkflowId;
    /** Human-readable name */
    name: string;
    /** Description of what this workflow does */
    description?: string;
    /** Nodes in the DAG */
    nodes: DAGNode[];
    /** Edges connecting nodes */
    edges: DAGEdge[];
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/** Result of a single node execution */
export interface NodeResult {
    /** Which node this result belongs to */
    nodeId: NodeId;
    /** Execution status */
    status: NodeStatus;
    /** Output produced by the node */
    output?: unknown;
    /** Error message if failed */
    error?: string;
    /** When execution started */
    startedAt?: string;
    /** When execution completed */
    completedAt?: string;
    /** Number of retry attempts */
    retryCount: number;
}
/** A workflow execution instance */
export interface WorkflowExecution {
    /** Unique execution identifier */
    id: string;
    /** Which DAG definition this execution belongs to */
    dagId: WorkflowId;
    /** Current overall status */
    status: WorkflowStatus;
    /** Input to the workflow */
    input: unknown;
    /** Currently executing node (if running) */
    currentNodeId?: NodeId;
    /** Results for each completed/attempted node */
    nodeResults: Map<NodeId, NodeResult>;
    /** When the execution started */
    startedAt?: string;
    /** When the execution completed */
    completedAt?: string;
    /** Error message if the workflow failed */
    error?: string;
}
/** Serializable version of WorkflowExecution (Maps become Records) */
export interface SerializedExecution {
    id: string;
    dagId: WorkflowId;
    status: WorkflowStatus;
    input: unknown;
    currentNodeId?: NodeId;
    nodeResults: Record<NodeId, NodeResult>;
    startedAt?: string;
    completedAt?: string;
    error?: string;
}
/** Retry configuration for failed tasks */
export interface RetryPolicy {
    /** Maximum number of attempts (including initial) */
    maxAttempts: number;
    /** Base delay between retries in ms */
    delayMs: number;
    /** Backoff strategy */
    backoff: 'linear' | 'exponential';
}
/** What to do when a quality gate fails */
export type QualityGateOnFailure = 'retry' | 'skip' | 'fail' | 'escalate';
/** Quality gate configuration on a node */
export interface QualityGateConfig {
    /** Name of the registered validator function */
    validator: string;
    /** Minimum score (0-100) to pass */
    minScore: number;
    /** Action to take when the gate fails */
    onFailure: QualityGateOnFailure;
}
/** Result of a quality gate validation */
export interface QualityGateResult {
    /** Whether the gate passed */
    passed: boolean;
    /** Score (0-100) */
    score: number;
    /** Human-readable message */
    message?: string;
}
/** Validator function signature */
export type QualityGateValidator = (output: unknown, config: QualityGateConfig) => Promise<QualityGateResult>;
/** A snapshot of workflow state for resume */
export interface WorkflowCheckpoint {
    /** Which execution this checkpoint belongs to */
    executionId: string;
    /** Which DAG definition */
    dagId: WorkflowId;
    /** Status at checkpoint time */
    status: WorkflowStatus;
    /** Nodes that have completed */
    completedNodes: NodeId[];
    /** Results for each node */
    nodeResults: Record<NodeId, NodeResult>;
    /** When the checkpoint was created */
    timestamp: string;
    /** Workflow input for resumption */
    input: unknown;
}
/** Context provided to task handlers */
export interface TaskContext {
    /** The node being executed */
    node: DAGNode;
    /** Input from the workflow or from the previous node */
    input: unknown;
    /** Results from all previously completed nodes */
    previousResults: Map<NodeId, NodeResult>;
    /** The execution ID */
    executionId: string;
}
/** Function that plugins provide to execute tasks */
export type TaskHandler = (context: TaskContext) => Promise<unknown>;
export interface WorkflowStartedPayload {
    executionId: string;
    dagId: WorkflowId;
    input: unknown;
}
export interface WorkflowCompletedPayload {
    executionId: string;
    dagId: WorkflowId;
    nodeResults: Record<NodeId, NodeResult>;
}
export interface WorkflowFailedPayload {
    executionId: string;
    dagId: WorkflowId;
    error: string;
    failedNodeId?: NodeId;
}
export interface NodeStartedPayload {
    executionId: string;
    dagId: WorkflowId;
    nodeId: NodeId;
    nodeName: string;
}
export interface NodeCompletedPayload {
    executionId: string;
    dagId: WorkflowId;
    nodeId: NodeId;
    output?: unknown;
}
export interface CheckpointSavedPayload {
    executionId: string;
    dagId: WorkflowId;
    completedNodes: NodeId[];
}
export interface QualityFailedPayload {
    executionId: string;
    dagId: WorkflowId;
    nodeId: NodeId;
    score: number;
    minScore: number;
    onFailure: QualityGateOnFailure;
}
/** Result of DAG validation */
export interface DAGValidationResult {
    /** Whether the DAG is valid */
    valid: boolean;
    /** Validation errors */
    errors: string[];
    /** Validation warnings */
    warnings: string[];
}
/** A reusable workflow template */
export interface WorkflowTemplate {
    /** Template identifier */
    id: string;
    /** Template name */
    name: string;
    /** Description */
    description?: string;
    /** The DAG definition (with placeholder values) */
    dag: DAGDefinition;
    /** Default parameter values */
    defaults?: Record<string, unknown>;
    /** Required parameters */
    requiredParams?: string[];
}
/** Configuration for the workflow engine */
export interface WorkflowEngineConfig {
    /** Default timeout for tasks in ms (default: 300000 = 5 minutes) */
    defaultTimeout?: number;
    /** Maximum parallel tasks (default: 10) */
    maxParallelism?: number;
    /** Whether to save checkpoints automatically (default: true) */
    autoCheckpoint?: boolean;
    /** Event source name for EventBus emissions */
    eventSource?: string;
}
//# sourceMappingURL=types.d.ts.map