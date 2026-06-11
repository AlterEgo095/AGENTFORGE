/**
 * ALTER EGO OS — Workflow Manager
 *
 * High-level lifecycle management for workflows:
 * - CRUD for workflow definitions (DAGs)
 * - Execution management (start, pause, resume, cancel)
 * - Workflow templates (create workflows from templates)
 * - Event-driven integration with the DAG Runtime
 */
import type { EventBus } from '@alterego/event-bus';
import type { DAGDefinition, TaskHandler, QualityGateValidator, WorkflowCheckpoint, WorkflowEngineConfig, WorkflowExecution, WorkflowId, WorkflowTemplate } from './types.js';
import { DAGRuntime, validateDAG } from './dag-runtime.js';
export declare class WorkflowManager {
    private readonly runtime;
    private readonly definitions;
    private readonly templates;
    private readonly eventBus?;
    constructor(options?: {
        eventBus?: EventBus;
        config?: WorkflowEngineConfig;
        runtime?: DAGRuntime;
    });
    /**
     * Register a workflow definition.
     * Validates the DAG before storing.
     */
    register(dag: DAGDefinition): void;
    /**
     * Get a registered workflow definition.
     */
    get(dagId: WorkflowId): DAGDefinition | undefined;
    /**
     * Update a workflow definition.
     * Validates before updating.
     */
    update(dag: DAGDefinition): void;
    /**
     * Delete a workflow definition.
     */
    delete(dagId: WorkflowId): boolean;
    /**
     * List all registered workflow definitions.
     */
    list(): DAGDefinition[];
    /**
     * Validate a DAG without registering it.
     */
    validate(dag: DAGDefinition): ReturnType<typeof validateDAG>;
    /**
     * Start a workflow execution by DAG ID.
     */
    start(dagId: WorkflowId, input?: unknown): Promise<WorkflowExecution>;
    /**
     * Start a workflow execution with a specific execution ID.
     */
    startWithId(dagId: WorkflowId, executionId: string, input?: unknown): Promise<WorkflowExecution>;
    /**
     * Resume a paused or failed workflow from its last checkpoint.
     */
    resume(dagId: WorkflowId, executionId: string): Promise<WorkflowExecution>;
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
     * Register a task handler for a task type.
     */
    registerTaskHandler(taskType: string, handler: TaskHandler): void;
    /**
     * Unregister a task handler.
     */
    unregisterTaskHandler(taskType: string): void;
    /**
     * Register a quality gate validator.
     */
    registerQualityGate(name: string, validator: QualityGateValidator): void;
    /**
     * Unregister a quality gate validator.
     */
    unregisterQualityGate(name: string): void;
    /**
     * Get a checkpoint for an execution.
     */
    getCheckpoint(executionId: string): Promise<WorkflowCheckpoint | null>;
    /**
     * List all checkpoints.
     */
    listCheckpoints(dagId?: WorkflowId): Promise<WorkflowCheckpoint[]>;
    /**
     * Register a workflow template.
     */
    registerTemplate(template: WorkflowTemplate): void;
    /**
     * Get a template by ID.
     */
    getTemplate(templateId: string): WorkflowTemplate | undefined;
    /**
     * List all templates.
     */
    listTemplates(): WorkflowTemplate[];
    /**
     * Create a workflow from a template with parameter overrides.
     * The template's DAG is cloned with defaults applied.
     */
    createFromTemplate(templateId: string, params?: Record<string, unknown>, newDagId?: string): DAGDefinition;
    /**
     * Access the underlying DAG runtime for advanced usage.
     */
    getRuntime(): DAGRuntime;
}
//# sourceMappingURL=workflow-manager.d.ts.map