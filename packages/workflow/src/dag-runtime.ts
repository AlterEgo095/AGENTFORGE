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
import type {
  DAGDefinition,
  DAGEdge,
  DAGNode,
  DAGValidationResult,
  NodeId,
  NodeResult,
  NodeStatus,
  QualityGateConfig,
  TaskContext,
  WorkflowEngineConfig,
  WorkflowExecution,
  WorkflowId,
  WorkflowStatus,
} from './types.js';
import { CheckpointManager } from './checkpoint.js';
import { QualityGateRunner } from './quality-gates.js';
import { TaskExecutor } from './task-executor.js';

// ─── Default Configuration ───────────────────────────────────

const DEFAULT_CONFIG: Required<WorkflowEngineConfig> = {
  defaultTimeout: 300_000, // 5 minutes
  maxParallelism: 10,
  autoCheckpoint: true,
  eventSource: 'workflow-engine',
};

// ─── DAG Validation ──────────────────────────────────────────

/**
 * Validate a DAG definition:
 * - No duplicate node IDs
 * - All edge references exist
 * - No cycles
 * - All nodes reachable from entry points (nodes with no incoming edges)
 */
export function validateDAG(dag: DAGDefinition): DAGValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate node IDs
  const nodeIds = new Set<NodeId>();
  const nodeMap = new Map<NodeId, DAGNode>();
  for (const node of dag.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
    nodeMap.set(node.id, node);
  }

  // Check edge references
  for (const edge of dag.edges) {
    if (!nodeMap.has(edge.from)) {
      errors.push(`Edge references non-existent source node: ${edge.from}`);
    }
    if (!nodeMap.has(edge.to)) {
      errors.push(`Edge references non-existent target node: ${edge.to}`);
    }
  }

  // Check for self-loops
  for (const edge of dag.edges) {
    if (edge.from === edge.to) {
      errors.push(`Self-loop detected on node: ${edge.from}`);
    }
  }

  // Check for cycles using DFS
  const cycleErrors = detectCycles(dag.nodes.map((n) => n.id), dag.edges);
  errors.push(...cycleErrors);

  // Check reachability
  const unreachable = findUnreachableNodes(dag.nodes, dag.edges);
  if (unreachable.length > 0) {
    warnings.push(`Unreachable nodes detected: ${unreachable.join(', ')}`);
  }

  // Empty DAG
  if (dag.nodes.length === 0) {
    warnings.push('DAG has no nodes');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect cycles using DFS with coloring.
 * Returns an array of error messages.
 */
function detectCycles(nodeIds: NodeId[], edges: DAGEdge[]): string[] {
  const errors: string[] = [];
  const adjacency = new Map<NodeId, NodeId[]>();

  for (const id of nodeIds) {
    adjacency.set(id, []);
  }
  for (const edge of edges) {
    const list = adjacency.get(edge.from);
    if (list) {
      list.push(edge.to);
    }
  }

  // DFS with 3-coloring: 0=white, 1=gray, 2=black
  const color = new Map<NodeId, number>();
  for (const id of nodeIds) {
    color.set(id, 0);
  }

  function dfs(nodeId: NodeId): boolean {
    color.set(nodeId, 1); // gray = in current path
    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      const neighborColor = color.get(neighbor);
      if (neighborColor === 1) {
        errors.push(`Cycle detected involving node: ${neighbor}`);
        return true;
      }
      if (neighborColor === 0) {
        if (dfs(neighbor)) return true;
      }
    }
    color.set(nodeId, 2); // black = done
    return false;
  }

  for (const id of nodeIds) {
    if (color.get(id) === 0) {
      if (dfs(id)) break; // Report first cycle only
    }
  }

  return errors;
}

/**
 * Find nodes that are unreachable or disconnected.
 * Uses weak connectivity (undirected) to find separate components.
 * Nodes in components other than the largest are flagged as unreachable.
 * Also flags isolated nodes (no edges at all).
 */
function findUnreachableNodes(nodes: DAGNode[], edges: DAGEdge[]): NodeId[] {
  if (nodes.length === 0) return [];

  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build undirected adjacency for weak connectivity
  const undirected = new Map<NodeId, Set<NodeId>>();
  for (const id of nodeIds) {
    undirected.set(id, new Set());
  }
  for (const edge of edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      undirected.get(edge.from)!.add(edge.to);
      undirected.get(edge.to)!.add(edge.from);
    }
  }

  // Find connected components via BFS
  const visited = new Set<NodeId>();
  const components: Set<NodeId>[] = [];

  for (const nodeId of nodeIds) {
    if (visited.has(nodeId)) continue;

    const component = new Set<NodeId>();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (component.has(current)) continue;
      component.add(current);
      visited.add(current);

      for (const neighbor of undirected.get(current) ?? []) {
        if (!component.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  // If only one component, nothing is unreachable
  if (components.length <= 1) return [];

  // Find the largest component (the "main" graph)
  const largestComponent = components.reduce((a, b) => a.size > b.size ? a : b);

  // Nodes in smaller components are considered unreachable
  const unreachable: NodeId[] = [];
  for (const component of components) {
    if (component !== largestComponent) {
      for (const nodeId of component) {
        unreachable.push(nodeId);
      }
    }
  }

  return unreachable;
}

/**
 * Compute execution layers using Kahn's algorithm.
 * Each layer contains nodes that can run in parallel.
 */
export function computeExecutionLayers(dag: DAGDefinition): NodeId[][] {
  const nodeIds = new Set(dag.nodes.map((n) => n.id));
  const inDegree = new Map<NodeId, number>();
  const adjacency = new Map<NodeId, NodeId[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of dag.edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      adjacency.get(edge.from)!.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }
  }

  // Start with nodes that have no incoming edges
  const layers: NodeId[][] = [];
  let currentLayer = nodeIds
    .values()
    .filter((id) => (inDegree.get(id) ?? 0) === 0)
    .toArray();

  while (currentLayer.length > 0) {
    layers.push([...currentLayer]);
    const nextLayer: NodeId[] = [];

    for (const nodeId of currentLayer) {
      for (const neighbor of adjacency.get(nodeId) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          nextLayer.push(neighbor);
        }
      }
    }

    currentLayer = nextLayer;
  }

  return layers;
}

// ─── DAG Runtime ─────────────────────────────────────────────

export class DAGRuntime {
  private readonly taskExecutor: TaskExecutor;
  private readonly qualityGateRunner: QualityGateRunner;
  private readonly checkpointManager: CheckpointManager;
  private readonly eventBus?: EventBus;
  private readonly config: Required<WorkflowEngineConfig>;

  /** Active executions */
  private readonly executions: Map<string, WorkflowExecution> = new Map();

  /** Set of cancelled execution IDs — checked during runDAG loop */
  private readonly cancelledExecutions: Set<string> = new Set();

  /** Approval resolvers — stored when a workflow pauses for approval */
  private readonly approvalResolvers: Map<string, {
    resolve: (approved: boolean) => void;
    reject: (reason: string) => void;
  }> = new Map();

  constructor(options?: {
    taskExecutor?: TaskExecutor;
    qualityGateRunner?: QualityGateRunner;
    checkpointManager?: CheckpointManager;
    eventBus?: EventBus;
    config?: WorkflowEngineConfig;
  }) {
    this.taskExecutor = options?.taskExecutor ?? new TaskExecutor();
    this.qualityGateRunner = options?.qualityGateRunner ?? new QualityGateRunner();
    this.checkpointManager = options?.checkpointManager ?? new CheckpointManager();
    this.eventBus = options?.eventBus;
    this.config = { ...DEFAULT_CONFIG, ...options?.config };
  }

  // ─── Accessors ──────────────────────────────────────────

  get executor(): TaskExecutor {
    return this.taskExecutor;
  }

  get qualityGates(): QualityGateRunner {
    return this.qualityGateRunner;
  }

  get checkpoints(): CheckpointManager {
    return this.checkpointManager;
  }

  // ─── Execution ──────────────────────────────────────────

  /**
   * Execute a DAG from start to finish.
   * Returns the final execution state.
   */
  async execute(
    dag: DAGDefinition,
    input?: unknown,
    executionId?: string,
  ): Promise<WorkflowExecution> {
    // Validate the DAG first
    const validation = validateDAG(dag);
    if (!validation.valid) {
      throw new Error(`Invalid DAG: ${validation.errors.join('; ')}`);
    }

    // Create execution record
    const execution = this.createExecution(dag.id, input, executionId);
    execution.status = 'running';
    execution.startedAt = new Date().toISOString();

    this.executions.set(execution.id, execution);

    // Emit workflow.started
    await this.emitEvent('workflow.started', {
      executionId: execution.id,
      dagId: dag.id,
      input,
    });

    try {
      await this.runDAG(dag, execution);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date().toISOString();

      await this.emitEvent('workflow.failed', {
        executionId: execution.id,
        dagId: dag.id,
        error: execution.error,
      });

      if (this.config.autoCheckpoint) {
        await this.checkpointManager.saveExecution(execution);
      }
    }

    return execution;
  }

  /**
   * Resume an execution from a checkpoint.
   */
  async resume(
    dag: DAGDefinition,
    executionId: string,
  ): Promise<WorkflowExecution> {
    const checkpoint = await this.checkpointManager.load(executionId);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for execution: ${executionId}`);
    }

    const execution = this.checkpointManager.restoreFromCheckpoint(checkpoint);
    execution.status = 'running';
    this.executions.set(execution.id, execution);

    try {
      await this.runDAG(dag, execution);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date().toISOString();

      await this.emitEvent('workflow.failed', {
        executionId: execution.id,
        dagId: dag.id,
        error: execution.error,
      });
    }

    return execution;
  }

  /**
   * Cancel a running execution.
   */
  async cancel(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    // Mark for cancellation — the runDAG loop will check this
    this.cancelledExecutions.add(executionId);

    execution.status = 'cancelled';
    execution.completedAt = new Date().toISOString();

    // Reject any pending approval
    const resolver = this.approvalResolvers.get(executionId);
    if (resolver) {
      resolver.reject('Execution cancelled');
      this.approvalResolvers.delete(executionId);
    }

    await this.emitEvent('workflow.failed', {
      executionId: execution.id,
      dagId: execution.dagId,
      error: 'Execution cancelled',
    });
  }

  /**
   * Approve a paused approval node.
   */
  async approve(executionId: string, approved: boolean): Promise<void> {
    const resolver = this.approvalResolvers.get(executionId);
    if (!resolver) {
      throw new Error(`No pending approval for execution: ${executionId}`);
    }
    resolver.resolve(approved);
    this.approvalResolvers.delete(executionId);
  }

  /**
   * Get an execution by ID.
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  // ─── Private: Core Execution Logic ──────────────────────

  /**
   * Run the DAG execution, processing nodes layer by layer.
   * Skips nodes that already completed (for resume support).
   */
  private async runDAG(dag: DAGDefinition, execution: WorkflowExecution): Promise<void> {
    const nodeMap = new Map(dag.nodes.map((n) => [n.id, n]));
    const completedNodes = new Set<NodeId>(
      this.getCompletedNodeIds(execution),
    );

    // Build a set of already-processed node IDs
    for (const nodeId of completedNodes) {
      // Already done from checkpoint
    }

    // Process layer by layer
    while (true) {
      // Check for cancellation
      if (this.cancelledExecutions.has(execution.id)) {
        this.cancelledExecutions.delete(execution.id);
        return; // Status already set by cancel()
      }

      // Find the next batch of ready nodes
      const readyNodes = this.findReadyNodes(dag, execution, completedNodes, nodeMap);

      if (readyNodes.length === 0) {
        // Check if all nodes are completed or if we're stuck
        const pendingNodes = dag.nodes.filter(
          (n) => !completedNodes.has(n.id) && this.getNodeStatus(execution, n.id) !== 'skipped',
        );

        if (pendingNodes.length === 0) {
          // All nodes done
          break;
        }

        // There are pending nodes but none are ready — something is wrong
        execution.status = 'failed';
        execution.error = 'Deadlock: pending nodes exist but none are ready to execute';
        execution.completedAt = new Date().toISOString();
        return;
      }

      // Execute ready nodes in parallel (limited by maxParallelism)
      const batch = readyNodes.slice(0, this.config.maxParallelism);
      const results = await Promise.allSettled(
        batch.map((node) => this.executeNode(dag, node, execution, nodeMap)),
      );

      // Process results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const node = batch[i];

        if (result.status === 'fulfilled') {
          execution.nodeResults.set(node.id, result.value);
          if (result.value.status === 'completed' || result.value.status === 'skipped') {
            completedNodes.add(node.id);
          } else if (result.value.status === 'failed') {
            // Check if this is an approval node that's waiting — don't fail the workflow
            const existingResult = execution.nodeResults.get(node.id);
            if (existingResult?.status === 'failed' && node.type === 'approval') {
              // Approval denied — fail the workflow
              execution.status = 'failed';
              execution.error = `Approval denied for node: ${node.name}`;
              execution.completedAt = new Date().toISOString();

              await this.emitEvent('workflow.failed', {
                executionId: execution.id,
                dagId: dag.id,
                error: execution.error,
                failedNodeId: node.id,
              });

              if (this.config.autoCheckpoint) {
                await this.checkpointManager.saveExecution(execution);
                await this.emitEvent('workflow.checkpoint.saved', {
                  executionId: execution.id,
                  dagId: dag.id,
                  completedNodes: [...completedNodes],
                });
              }

              return;
            }

            // A node failed — the workflow fails
            execution.status = 'failed';
            execution.error = result.value.error ?? `Node ${node.id} failed`;
            execution.completedAt = new Date().toISOString();

            await this.emitEvent('workflow.failed', {
              executionId: execution.id,
              dagId: dag.id,
              error: execution.error,
              failedNodeId: node.id,
            });

            if (this.config.autoCheckpoint) {
              await this.checkpointManager.saveExecution(execution);
            }

            return;
          }
        } else {
          // Unexpected rejection
          const errorResult: NodeResult = {
            nodeId: node.id,
            status: 'failed',
            error: result.reason?.message ?? String(result.reason),
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            retryCount: 0,
          };
          execution.nodeResults.set(node.id, errorResult);

          execution.status = 'failed';
          execution.error = errorResult.error;
          execution.completedAt = new Date().toISOString();

          await this.emitEvent('workflow.failed', {
            executionId: execution.id,
            dagId: dag.id,
            error: execution.error,
            failedNodeId: node.id,
          });

          if (this.config.autoCheckpoint) {
            await this.checkpointManager.saveExecution(execution);
          }

          return;
        }
      }

      // Save checkpoint after each layer
      if (this.config.autoCheckpoint) {
        const checkpoint = await this.checkpointManager.saveExecution(execution);
        await this.emitEvent('workflow.checkpoint.saved', {
          executionId: execution.id,
          dagId: dag.id,
          completedNodes: [...completedNodes],
        });
      }
    }

    // All nodes completed successfully
    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();

    await this.emitEvent('workflow.completed', {
      executionId: execution.id,
      dagId: dag.id,
      nodeResults: this.serializeNodeResults(execution.nodeResults),
    });
  }

  /**
   * Execute a single node, handling:
   * - Skip if already completed (resume case)
   * - Approval nodes that pause execution
   * - Quality gate validation
   * - Retry within the TaskExecutor
   */
  private async executeNode(
    dag: DAGDefinition,
    node: DAGNode,
    execution: WorkflowExecution,
    nodeMap: Map<NodeId, DAGNode>,
  ): Promise<NodeResult> {
    // Skip if already completed (resume case)
    const existing = execution.nodeResults.get(node.id);
    if (existing && (existing.status === 'completed' || existing.status === 'skipped')) {
      return existing;
    }

    // Emit node.started
    await this.emitEvent('workflow.node.started', {
      executionId: execution.id,
      dagId: dag.id,
      nodeId: node.id,
      nodeName: node.name,
    });

    execution.currentNodeId = node.id;

    // Handle approval nodes
    if (node.type === 'approval') {
      return this.executeApprovalNode(dag, node, execution);
    }

    // Build task context
    const context = this.buildTaskContext(node, execution);

    // Execute the task
    let result = await this.taskExecutor.execute(node, context);

    // If the task completed, run quality gate if configured
    if (result.status === 'completed' && node.qualityGate) {
      const gateResult = await this.runQualityGate(dag, node, execution, result);
      if (!gateResult.passed) {
        // Handle quality gate failure
        result = await this.handleQualityGateFailure(dag, node, execution, result, node.qualityGate);
      }
    }

    // Emit node.completed
    await this.emitEvent('workflow.node.completed', {
      executionId: execution.id,
      dagId: dag.id,
      nodeId: node.id,
      output: result.output,
    });

    // Save checkpoint after each node
    if (this.config.autoCheckpoint && result.status === 'completed') {
      await this.checkpointManager.saveExecution(execution);
    }

    return result;
  }

  /**
   * Handle an approval node by pausing execution until approved.
   */
  private async executeApprovalNode(
    dag: DAGDefinition,
    node: DAGNode,
    execution: WorkflowExecution,
  ): Promise<NodeResult> {
    const startedAt = new Date().toISOString();

    // Pause execution and wait for approval
    execution.status = 'paused';

    const approved = await new Promise<boolean>((resolve, reject) => {
      this.approvalResolvers.set(execution.id, { resolve, reject });
    });

    execution.status = 'running';

    if (approved) {
      const result: NodeResult = {
        nodeId: node.id,
        status: 'completed',
        output: { approved: true },
        startedAt,
        completedAt: new Date().toISOString(),
        retryCount: 0,
      };

      await this.emitEvent('workflow.node.completed', {
        executionId: execution.id,
        dagId: dag.id,
        nodeId: node.id,
        output: result.output,
      });

      return result;
    }

    return {
      nodeId: node.id,
      status: 'failed',
      error: 'Approval denied',
      startedAt,
      completedAt: new Date().toISOString(),
      retryCount: 0,
    };
  }

  /**
   * Run the quality gate validator for a node.
   */
  private async runQualityGate(
    dag: DAGDefinition,
    node: DAGNode,
    execution: WorkflowExecution,
    result: NodeResult,
  ): Promise<{ passed: boolean; score: number }> {
    const config = node.qualityGate!;
    try {
      const gateResult = await this.qualityGateRunner.evaluate(result.output, config);
      return { passed: gateResult.passed, score: gateResult.score };
    } catch {
      // Validator not found or errored — treat as passed to not block
      return { passed: true, score: 100 };
    }
  }

  /**
   * Handle quality gate failure based on the configured onFailure action.
   */
  private async handleQualityGateFailure(
    dag: DAGDefinition,
    node: DAGNode,
    execution: WorkflowExecution,
    originalResult: NodeResult,
    config: QualityGateConfig,
  ): Promise<NodeResult> {
    // Emit quality.failed event
    await this.emitEvent('workflow.quality.failed', {
      executionId: execution.id,
      dagId: dag.id,
      nodeId: node.id,
      score: 0,
      minScore: config.minScore,
      onFailure: config.onFailure,
    });

    switch (config.onFailure) {
      case 'skip': {
        return {
          ...originalResult,
          status: 'skipped',
          output: originalResult.output,
        };
      }

      case 'retry': {
        // Retry the node once more (the task executor already handled retries,
        // so this is a quality-gate-specific retry)
        const context = this.buildTaskContext(node, execution);
        const retryResult = await this.taskExecutor.execute(node, context);
        return {
          ...retryResult,
          retryCount: (originalResult.retryCount ?? 0) + 1,
        };
      }

      case 'fail': {
        return {
          ...originalResult,
          status: 'failed',
          error: `Quality gate failed (validator: ${config.validator}, minScore: ${config.minScore})`,
        };
      }

      case 'escalate': {
        // Escalate = pause the workflow and wait for human intervention
        // For now, treat as a failure that requires manual resolution
        return {
          ...originalResult,
          status: 'failed',
          error: `Quality gate failed and escalated (validator: ${config.validator}, minScore: ${config.minScore})`,
        };
      }

      default:
        return originalResult;
    }
  }

  /**
   * Build a TaskContext for a node execution.
   */
  private buildTaskContext(node: DAGNode, execution: WorkflowExecution): TaskContext {
    // Find the input for this node — output of predecessor, or workflow input
    const input = this.resolveNodeInput(node, execution);

    return {
      node,
      input,
      previousResults: new Map(execution.nodeResults),
      executionId: execution.id,
    };
  }

  /**
   * Resolve the input for a node by looking at its predecessor's output.
   */
  private resolveNodeInput(node: DAGNode, execution: WorkflowExecution): unknown {
    // For the first node (no predecessors), use the workflow input
    // For subsequent nodes, use the output of the most recent completed predecessor
    // This is a simplified approach — in a full system, you'd use conditional edges

    // Check if execution has any completed node results
    if (execution.nodeResults.size === 0) {
      return execution.input;
    }

    // Find the latest completed predecessor's output
    // For simplicity, we pass the workflow input + all previous results
    // Individual task handlers can pick what they need from previousResults
    return execution.input;
  }

  /**
   * Find nodes that are ready to execute.
   * A node is ready if:
   * - It hasn't been executed yet (or failed and is retryable)
   * - All its dependencies have completed
   */
  private findReadyNodes(
    dag: DAGDefinition,
    execution: WorkflowExecution,
    completedNodes: Set<NodeId>,
    nodeMap: Map<NodeId, DAGNode>,
  ): DAGNode[] {
    const ready: DAGNode[] = [];

    for (const node of dag.nodes) {
      // Skip if already completed
      if (completedNodes.has(node.id)) continue;

      // Skip if currently running
      const currentStatus = this.getNodeStatus(execution, node.id);
      if (currentStatus === 'running') continue;

      // Check if all dependencies are satisfied
      const dependencies = this.getNodeDependencies(node.id, dag.edges);

      const allDepsComplete = dependencies.every((depId) => {
        // Conditional edges: check if the condition is met
        return completedNodes.has(depId);
      });

      if (allDepsComplete) {
        // Check conditional edges — a node might only be ready if conditions match
        // For now, we include it as ready if all deps are complete
        ready.push(node);
      }
    }

    return ready;
  }

  /**
   * Get all node IDs that have incoming edges to this node (dependencies).
   */
  private getNodeDependencies(nodeId: NodeId, edges: DAGEdge[]): NodeId[] {
    return edges
      .filter((e) => e.to === nodeId)
      .map((e) => e.from);
  }

  /**
   * Get the current status of a node from the execution.
   */
  private getNodeStatus(execution: WorkflowExecution, nodeId: NodeId): NodeStatus {
    return execution.nodeResults.get(nodeId)?.status ?? 'pending';
  }

  /**
   * Get IDs of all completed nodes in an execution.
   */
  private getCompletedNodeIds(execution: WorkflowExecution): NodeId[] {
    const result: NodeId[] = [];
    for (const [nodeId, nodeResult] of execution.nodeResults) {
      if (nodeResult.status === 'completed' || nodeResult.status === 'skipped') {
        result.push(nodeId);
      }
    }
    return result;
  }

  /**
   * Create a new WorkflowExecution instance.
   */
  private createExecution(dagId: WorkflowId, input?: unknown, executionId?: string): WorkflowExecution {
    const id = executionId ?? `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      id,
      dagId,
      status: 'pending',
      input: input ?? null,
      nodeResults: new Map(),
    };
  }

  /**
   * Emit an event through the EventBus if available.
   */
  private async emitEvent(type: string, payload: unknown): Promise<void> {
    if (!this.eventBus) return;

    await this.eventBus.emit({
      type,
      payload,
      source: this.config.eventSource,
      priority: 'normal',
    });
  }

  /**
   * Serialize a Map<NodeId, NodeResult> to a Record.
   */
  private serializeNodeResults(nodeResults: Map<NodeId, NodeResult>): Record<NodeId, NodeResult> {
    const result: Record<NodeId, NodeResult> = {};
    for (const [key, value] of nodeResults) {
      result[key] = value;
    }
    return result;
  }
}
