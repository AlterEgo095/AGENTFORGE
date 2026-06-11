/**
 * ALTER EGO OS — DAG Runtime
 *
 * Core DAG execution engine with:
 * - DAG validation (no cycles, all nodes reachable)
 * - Topological ordering for execution layers
 * - Parallel execution of independent nodes
 * - Conditional edge evaluation
 * - Integration with TaskExecutor, QualityGateRunner, CheckpointManager, EventBus
 */
import type { EventBus } from '@alterego/event-bus';
import type { DAGDefinition, DAGValidationResult, NodeId, WorkflowEngineConfig, WorkflowExecution } from './types.js';
import { CheckpointManager } from './checkpoint.js';
import { QualityGateRunner } from './quality-gates.js';
import { TaskExecutor } from './task-executor.js';
/**
 * Validate a DAG definition:
 * - No duplicate node IDs
 * - All edge references exist
 * - No cycles
 * - All nodes reachable from entry points (nodes with no incoming edges)
 */
export declare function validateDAG(dag: DAGDefinition): DAGValidationResult;
/**
 * Compute execution layers using Kahn's algorithm.
 * Each layer contains nodes that can run in parallel.
 */
export declare function computeExecutionLayers(dag: DAGDefinition): NodeId[][];
export declare class DAGRuntime {
    private readonly taskExecutor;
    private readonly qualityGateRunner;
    private readonly checkpointManager;
    private readonly eventBus?;
    private readonly config;
    /** Active executions */
    private readonly executions;
    /** Set of cancelled execution IDs — checked during runDAG loop */
    private readonly cancelledExecutions;
    /** Approval resolvers — stored when a workflow pauses for approval */
    private readonly approvalResolvers;
    constructor(options?: {
        taskExecutor?: TaskExecutor;
        qualityGateRunner?: QualityGateRunner;
        checkpointManager?: CheckpointManager;
        eventBus?: EventBus;
        config?: WorkflowEngineConfig;
    });
    get executor(): TaskExecutor;
    get qualityGates(): QualityGateRunner;
    get checkpoints(): CheckpointManager;
    /**
     * Execute a DAG from start to finish.
     * Returns the final execution state.
     */
    execute(dag: DAGDefinition, input?: unknown, executionId?: string): Promise<WorkflowExecution>;
    /**
     * Resume an execution from a checkpoint.
     */
    resume(dag: DAGDefinition, executionId: string): Promise<WorkflowExecution>;
    /**
     * Cancel a running execution.
     */
    cancel(executionId: string): Promise<void>;
    /**
     * Approve a paused approval node.
     */
    approve(executionId: string, approved: boolean): Promise<void>;
    /**
     * Get an execution by ID.
     */
    getExecution(executionId: string): WorkflowExecution | undefined;
    /**
     * Run the DAG execution, processing nodes layer by layer.
     * Skips nodes that already completed (for resume support).
     */
    private runDAG;
    /**
     * Execute a single node, handling:
     * - Skip if already completed (resume case)
     * - Approval nodes that pause execution
     * - Quality gate validation
     * - Retry within the TaskExecutor
     */
    private executeNode;
    /**
     * Handle an approval node by pausing execution until approved.
     */
    private executeApprovalNode;
    /**
     * Run the quality gate validator for a node.
     */
    private runQualityGate;
    /**
     * Handle quality gate failure based on the configured onFailure action.
     */
    private handleQualityGateFailure;
    /**
     * Build a TaskContext for a node execution.
     */
    private buildTaskContext;
    /**
     * Resolve the input for a node by looking at its predecessor's output.
     */
    private resolveNodeInput;
    /**
     * Find nodes that are ready to execute.
     * A node is ready if:
     * - It hasn't been executed yet (or failed and is retryable)
     * - All its dependencies have completed
     */
    private findReadyNodes;
    /**
     * Get all node IDs that have incoming edges to this node (dependencies).
     */
    private getNodeDependencies;
    /**
     * Get the current status of a node from the execution.
     */
    private getNodeStatus;
    /**
     * Get IDs of all completed nodes in an execution.
     */
    private getCompletedNodeIds;
    /**
     * Create a new WorkflowExecution instance.
     */
    private createExecution;
    /**
     * Emit an event through the EventBus if available.
     */
    private emitEvent;
    /**
     * Serialize a Map<NodeId, NodeResult> to a Record.
     */
    private serializeNodeResults;
}
//# sourceMappingURL=dag-runtime.d.ts.map