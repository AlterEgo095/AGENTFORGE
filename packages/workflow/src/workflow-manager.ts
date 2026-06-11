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
import type {
  DAGDefinition,
  TaskHandler,
  QualityGateValidator,
  WorkflowCheckpoint,
  WorkflowEngineConfig,
  WorkflowExecution,
  WorkflowId,
  WorkflowTemplate,
} from './types.js';
import { DAGRuntime, validateDAG } from './dag-runtime.js';
import { CheckpointManager } from './checkpoint.js';

// ─── Workflow Manager ────────────────────────────────────────

export class WorkflowManager {
  private readonly runtime: DAGRuntime;
  private readonly definitions: Map<WorkflowId, DAGDefinition> = new Map();
  private readonly templates: Map<string, WorkflowTemplate> = new Map();
  private readonly eventBus?: EventBus;

  constructor(options?: {
    eventBus?: EventBus;
    config?: WorkflowEngineConfig;
    runtime?: DAGRuntime;
  }) {
    this.eventBus = options?.eventBus;
    this.runtime = options?.runtime ?? new DAGRuntime({
      eventBus: this.eventBus,
      config: options?.config,
    });
  }

  // ─── DAG Definition CRUD ────────────────────────────────

  /**
   * Register a workflow definition.
   * Validates the DAG before storing.
   */
  register(dag: DAGDefinition): void {
    const validation = validateDAG(dag);
    if (!validation.valid) {
      throw new Error(`Cannot register invalid DAG: ${validation.errors.join('; ')}`);
    }
    this.definitions.set(dag.id, dag);
  }

  /**
   * Get a registered workflow definition.
   */
  get(dagId: WorkflowId): DAGDefinition | undefined {
    return this.definitions.get(dagId);
  }

  /**
   * Update a workflow definition.
   * Validates before updating.
   */
  update(dag: DAGDefinition): void {
    if (!this.definitions.has(dag.id)) {
      throw new Error(`Workflow not found: ${dag.id}`);
    }
    const validation = validateDAG(dag);
    if (!validation.valid) {
      throw new Error(`Cannot update with invalid DAG: ${validation.errors.join('; ')}`);
    }
    this.definitions.set(dag.id, dag);
  }

  /**
   * Delete a workflow definition.
   */
  delete(dagId: WorkflowId): boolean {
    return this.definitions.delete(dagId);
  }

  /**
   * List all registered workflow definitions.
   */
  list(): DAGDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Validate a DAG without registering it.
   */
  validate(dag: DAGDefinition): ReturnType<typeof validateDAG> {
    return validateDAG(dag);
  }

  // ─── Execution Management ───────────────────────────────

  /**
   * Start a workflow execution by DAG ID.
   */
  async start(dagId: WorkflowId, input?: unknown): Promise<WorkflowExecution> {
    const dag = this.definitions.get(dagId);
    if (!dag) {
      throw new Error(`Workflow not found: ${dagId}`);
    }
    return this.runtime.execute(dag, input);
  }

  /**
   * Start a workflow execution with a specific execution ID.
   */
  async startWithId(dagId: WorkflowId, executionId: string, input?: unknown): Promise<WorkflowExecution> {
    const dag = this.definitions.get(dagId);
    if (!dag) {
      throw new Error(`Workflow not found: ${dagId}`);
    }
    return this.runtime.execute(dag, input, executionId);
  }

  /**
   * Resume a paused or failed workflow from its last checkpoint.
   */
  async resume(dagId: WorkflowId, executionId: string): Promise<WorkflowExecution> {
    const dag = this.definitions.get(dagId);
    if (!dag) {
      throw new Error(`Workflow not found: ${dagId}`);
    }
    return this.runtime.resume(dag, executionId);
  }

  /**
   * Cancel a running execution.
   */
  async cancel(executionId: string): Promise<void> {
    return this.runtime.cancel(executionId);
  }

  /**
   * Approve a paused approval node.
   */
  async approve(executionId: string, approved: boolean): Promise<void> {
    return this.runtime.approve(executionId, approved);
  }

  /**
   * Get an execution by ID.
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.runtime.getExecution(executionId);
  }

  // ─── Task Handler Registration ──────────────────────────

  /**
   * Register a task handler for a task type.
   */
  registerTaskHandler(taskType: string, handler: TaskHandler): void {
    this.runtime.executor.registerHandler(taskType, handler);
  }

  /**
   * Unregister a task handler.
   */
  unregisterTaskHandler(taskType: string): void {
    this.runtime.executor.unregisterHandler(taskType);
  }

  // ─── Quality Gate Registration ──────────────────────────

  /**
   * Register a quality gate validator.
   */
  registerQualityGate(name: string, validator: QualityGateValidator): void {
    this.runtime.qualityGates.registerValidator(name, validator);
  }

  /**
   * Unregister a quality gate validator.
   */
  unregisterQualityGate(name: string): void {
    this.runtime.qualityGates.unregisterValidator(name);
  }

  // ─── Checkpoint Management ──────────────────────────────

  /**
   * Get a checkpoint for an execution.
   */
  async getCheckpoint(executionId: string): Promise<WorkflowCheckpoint | null> {
    return this.runtime.checkpoints.load(executionId);
  }

  /**
   * List all checkpoints.
   */
  async listCheckpoints(dagId?: WorkflowId): Promise<WorkflowCheckpoint[]> {
    return this.runtime.checkpoints.list(dagId);
  }

  // ─── Workflow Templates ─────────────────────────────────

  /**
   * Register a workflow template.
   */
  registerTemplate(template: WorkflowTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get a template by ID.
   */
  getTemplate(templateId: string): WorkflowTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * List all templates.
   */
  listTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Create a workflow from a template with parameter overrides.
   * The template's DAG is cloned with defaults applied.
   */
  createFromTemplate(
    templateId: string,
    params?: Record<string, unknown>,
    newDagId?: string,
  ): DAGDefinition {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Deep clone the DAG
    const dag = JSON.parse(JSON.stringify(template.dag)) as DAGDefinition;

    // Apply new ID if specified
    if (newDagId) {
      dag.id = newDagId;
    }

    // Apply parameter defaults and overrides to node configs
    const mergedParams = { ...template.defaults, ...params };

    for (const node of dag.nodes) {
      for (const [key, value] of Object.entries(mergedParams)) {
        if (node.config[key] === '{{param}}' || node.config[key] === undefined) {
          node.config[key] = value;
        }
      }
    }

    // Validate the resulting DAG
    const validation = validateDAG(dag);
    if (!validation.valid) {
      throw new Error(`Template produces invalid DAG: ${validation.errors.join('; ')}`);
    }

    // Register it
    this.register(dag);

    return dag;
  }

  // ─── Accessors ──────────────────────────────────────────

  /**
   * Access the underlying DAG runtime for advanced usage.
   */
  getRuntime(): DAGRuntime {
    return this.runtime;
  }
}
