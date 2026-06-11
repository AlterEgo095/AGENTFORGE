/**
 * ALTER EGO OS — DAG Generator
 *
 * Converts MissionPlans into Workflow DAG Definitions that the
 * Workflow Engine can execute.
 *
 * Key responsibilities:
 * - Map PlanSteps to DAGNodes with proper config
 * - Map StepDependencies to DAGEdges
 * - Validate the generated DAG (no cycles, all nodes reachable)
 * - Assign retry policies and quality gates from the plan
 */

import type {
  DAGDefinition,
  DAGNode,
  DAGEdge,
  DAGValidationResult,
  RetryPolicy as WorkflowRetryPolicy,
  QualityGateConfig,
} from '@alterego/workflow';
import type { MissionPlan, PlanStep } from './types.js';

// ─── ID Generation ───────────────────────────────────────────

let dagCounter = 0;

function generateDagId(): string {
  return `dag_${Date.now()}_${++dagCounter}_${Math.random().toString(36).substring(2, 8)}`;
}

// ─── DAG Generation ──────────────────────────────────────────

/**
 * Convert a MissionPlan into a DAGDefinition for the Workflow Engine.
 * Validates the resulting DAG and throws if it's invalid.
 */
export function generateDAG(plan: MissionPlan): DAGDefinition {
  // Map steps to DAG nodes
  const nodes: DAGNode[] = plan.steps.map((step) => stepToNode(step));

  // Map dependencies to DAG edges
  const edges: DAGEdge[] = plan.dependencies.map((dep) => ({
    from: dep.from,
    to: dep.to,
  }));

  const dag: DAGDefinition = {
    id: generateDagId(),
    name: `Mission: ${plan.missionId}`,
    description: `Auto-generated DAG for mission ${plan.missionId} with ${plan.steps.length} steps`,
    nodes,
    edges,
    metadata: {
      missionId: plan.missionId,
      estimatedCostUsd: plan.estimatedCostUsd,
      estimatedDurationMs: plan.estimatedDurationMs,
      estimatedQualityScore: plan.estimatedQualityScore,
      generatedAt: new Date().toISOString(),
    },
  };

  // Validate the generated DAG
  const validation = validateGeneratedDAG(dag);
  if (!validation.valid) {
    throw new Error(`Generated DAG is invalid: ${validation.errors.join('; ')}`);
  }

  return dag;
}

/**
 * Convert a PlanStep to a DAGNode.
 */
function stepToNode(step: PlanStep): DAGNode {
  const node: DAGNode = {
    id: step.id,
    type: 'task',
    name: step.name,
    config: {
      ...step.config,
      handler: step.agentType, // TaskExecutor uses config.handler as fallback
      agentType: step.agentType,
      input: step.input,
      description: step.description,
    },
  };

  // Apply timeout (default 5 minutes per step)
  node.timeout = 300_000;

  // Apply retry policy if specified
  if (step.retryPolicy) {
    node.retryPolicy = {
      maxAttempts: step.retryPolicy.maxAttempts,
      delayMs: step.retryPolicy.delayMs,
      backoff: step.retryPolicy.backoff,
    } as WorkflowRetryPolicy;
  }

  // Apply quality gate if specified
  if (step.qualityGate) {
    node.qualityGate = {
      validator: `quality_${step.agentType}`,
      minScore: step.qualityGate.minScore,
      onFailure: step.qualityGate.onFailure as QualityGateConfig['onFailure'],
    };
  }

  return node;
}

// ─── DAG Validation ──────────────────────────────────────────

/**
 * Validate a generated DAG:
 * 1. No duplicate node IDs
 * 2. All edge references point to existing nodes
 * 3. No self-loops
 * 4. No cycles
 * 5. All nodes reachable from entry points
 *
 * This is a standalone validation that doesn't depend on the
 * Workflow Engine's validateDAG (to avoid circular dependencies).
 */
export function validateGeneratedDAG(dag: DAGDefinition): DAGValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check for duplicate node IDs
  const nodeIds = new Set<string>();
  for (const node of dag.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // 2. Check edge references
  for (const edge of dag.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push(`Edge references non-existent source node: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`Edge references non-existent target node: ${edge.to}`);
    }
  }

  // 3. Check for self-loops
  for (const edge of dag.edges) {
    if (edge.from === edge.to) {
      errors.push(`Self-loop detected on node: ${edge.from}`);
    }
  }

  // 4. Check for cycles using DFS with 3-coloring
  const cycleErrors = detectCycles(dag.nodes.map((n) => n.id), dag.edges);
  errors.push(...cycleErrors);

  // 5. Check reachability
  const unreachable = findUnreachableNodes(dag.nodes, dag.edges);
  if (unreachable.length > 0) {
    warnings.push(`Unreachable nodes detected: ${unreachable.join(', ')}`);
  }

  // 6. Empty DAG
  if (dag.nodes.length === 0) {
    warnings.push('DAG has no nodes');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Cycle Detection ─────────────────────────────────────────

/**
 * Detect cycles in the DAG using DFS with 3-coloring.
 * Returns error messages for any cycles found.
 */
function detectCycles(nodeIds: string[], edges: DAGEdge[]): string[] {
  const errors: string[] = [];

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
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
  const color = new Map<string, number>();
  for (const id of nodeIds) {
    color.set(id, 0);
  }

  function dfs(nodeId: string): boolean {
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

// ─── Reachability ────────────────────────────────────────────

/**
 * Find nodes that are unreachable or disconnected.
 * Uses weak connectivity (undirected) to find separate components.
 */
function findUnreachableNodes(nodes: DAGNode[], edges: DAGEdge[]): string[] {
  if (nodes.length === 0) return [];

  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build undirected adjacency for weak connectivity
  const undirected = new Map<string, Set<string>>();
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
  const visited = new Set<string>();
  const components: Set<string>[] = [];

  for (const nodeId of nodeIds) {
    if (visited.has(nodeId)) continue;

    const component = new Set<string>();
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

  // Find the largest component
  const largestComponent = components.reduce((a, b) => (a.size > b.size ? a : b));

  // Nodes in smaller components are unreachable
  const unreachable: string[] = [];
  for (const component of components) {
    if (component !== largestComponent) {
      for (const nodeId of component) {
        unreachable.push(nodeId);
      }
    }
  }

  return unreachable;
}
