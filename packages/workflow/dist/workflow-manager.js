/**
 * ALTER EGO OS — Workflow Manager
 *
 * High-level lifecycle management for workflows:
 * - CRUD for workflow definitions (DAGs)
 * - Execution management (start, pause, resume, cancel)
 * - Workflow templates (create workflows from templates)
 * - Event-driven integration with the DAG Runtime
 */
import { DAGRuntime, validateDAG } from './dag-runtime.js';
// ─── Workflow Manager ────────────────────────────────────────
export class WorkflowManager {
    runtime;
    definitions = new Map();
    templates = new Map();
    eventBus;
    constructor(options) {
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
    register(dag) {
        const validation = validateDAG(dag);
        if (!validation.valid) {
            throw new Error(`Cannot register invalid DAG: ${validation.errors.join('; ')}`);
        }
        this.definitions.set(dag.id, dag);
    }
    /**
     * Get a registered workflow definition.
     */
    get(dagId) {
        return this.definitions.get(dagId);
    }
    /**
     * Update a workflow definition.
     * Validates before updating.
     */
    update(dag) {
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
    delete(dagId) {
        return this.definitions.delete(dagId);
    }
    /**
     * List all registered workflow definitions.
     */
    list() {
        return Array.from(this.definitions.values());
    }
    /**
     * Validate a DAG without registering it.
     */
    validate(dag) {
        return validateDAG(dag);
    }
    // ─── Execution Management ───────────────────────────────
    /**
     * Start a workflow execution by DAG ID.
     */
    async start(dagId, input) {
        const dag = this.definitions.get(dagId);
        if (!dag) {
            throw new Error(`Workflow not found: ${dagId}`);
        }
        return this.runtime.execute(dag, input);
    }
    /**
     * Start a workflow execution with a specific execution ID.
     */
    async startWithId(dagId, executionId, input) {
        const dag = this.definitions.get(dagId);
        if (!dag) {
            throw new Error(`Workflow not found: ${dagId}`);
        }
        return this.runtime.execute(dag, input, executionId);
    }
    /**
     * Resume a paused or failed workflow from its last checkpoint.
     */
    async resume(dagId, executionId) {
        const dag = this.definitions.get(dagId);
        if (!dag) {
            throw new Error(`Workflow not found: ${dagId}`);
        }
        return this.runtime.resume(dag, executionId);
    }
    /**
     * Cancel a running execution.
     */
    async cancel(executionId) {
        return this.runtime.cancel(executionId);
    }
    /**
     * Approve a paused approval node.
     */
    async approve(executionId, approved) {
        return this.runtime.approve(executionId, approved);
    }
    /**
     * Get an execution by ID.
     */
    getExecution(executionId) {
        return this.runtime.getExecution(executionId);
    }
    // ─── Task Handler Registration ──────────────────────────
    /**
     * Register a task handler for a task type.
     */
    registerTaskHandler(taskType, handler) {
        this.runtime.executor.registerHandler(taskType, handler);
    }
    /**
     * Unregister a task handler.
     */
    unregisterTaskHandler(taskType) {
        this.runtime.executor.unregisterHandler(taskType);
    }
    // ─── Quality Gate Registration ──────────────────────────
    /**
     * Register a quality gate validator.
     */
    registerQualityGate(name, validator) {
        this.runtime.qualityGates.registerValidator(name, validator);
    }
    /**
     * Unregister a quality gate validator.
     */
    unregisterQualityGate(name) {
        this.runtime.qualityGates.unregisterValidator(name);
    }
    // ─── Checkpoint Management ──────────────────────────────
    /**
     * Get a checkpoint for an execution.
     */
    async getCheckpoint(executionId) {
        return this.runtime.checkpoints.load(executionId);
    }
    /**
     * List all checkpoints.
     */
    async listCheckpoints(dagId) {
        return this.runtime.checkpoints.list(dagId);
    }
    // ─── Workflow Templates ─────────────────────────────────
    /**
     * Register a workflow template.
     */
    registerTemplate(template) {
        this.templates.set(template.id, template);
    }
    /**
     * Get a template by ID.
     */
    getTemplate(templateId) {
        return this.templates.get(templateId);
    }
    /**
     * List all templates.
     */
    listTemplates() {
        return Array.from(this.templates.values());
    }
    /**
     * Create a workflow from a template with parameter overrides.
     * The template's DAG is cloned with defaults applied.
     */
    createFromTemplate(templateId, params, newDagId) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        // Deep clone the DAG
        const dag = JSON.parse(JSON.stringify(template.dag));
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
    getRuntime() {
        return this.runtime;
    }
}
//# sourceMappingURL=workflow-manager.js.map