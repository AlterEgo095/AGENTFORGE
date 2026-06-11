/**
 * ALTER EGO OS — Super Orchestrator
 *
 * The BRAIN of ALTER EGO OS. It receives missions, decomposes them into
 * plans, creates workflow DAGs, and delegates execution to specialized
 * agents via the Workflow Engine.
 *
 * Key principle: The Orchestrator NEVER produces content directly.
 * It always delegates to agents via the Workflow Engine.
 *
 * After execution, it integrates with:
 * - Reflection Engine — to reflect on results
 * - Memory Store — to store mission outcomes
 * - Knowledge Store — to archive deliverables
 * - Learning Engine — to record outcomes for future improvement
 * - Cost Optimizer — to track costs
 */

import type { EventBus } from '@alterego/event-bus';
import type { Logger } from '@alterego/kernel';
import type { WorkflowManager, WorkflowExecution } from '@alterego/workflow';
import type { MemoryStore } from '@alterego/memory';
import type { KnowledgeStore } from '@alterego/knowledge';
import type { ReflectionEngine } from '@alterego/reflection';
import type { LearningEngine } from '@alterego/learning';
import type { CostOptimizer } from '@alterego/cost-optimizer';
import type {
  Mission,
  MissionId,
  MissionOptions,
  MissionPlan,
  MissionResult,
  MissionStatus,
  MissionType,
  MissionConstraints,
  ParsedMission,
  Deliverable,
  OrchestratorDeps,
  OrchestratorConfig,
} from './types.js';
import { parseMission } from './mission-parser.js';
import { createPlan } from './planner.js';
import { generateDAG } from './dag-generator.js';

// ─── Default Configuration ───────────────────────────────────

const DEFAULT_CONFIG: Required<OrchestratorConfig> = {
  autoReflect: true,
  autoMemory: true,
  autoKnowledge: true,
  autoLearning: true,
  defaultMinQualityScore: 70,
  defaultMaxBudgetUsd: 10,
  defaultMaxDurationMs: 3_600_000, // 1 hour
};

// ─── ID Generation ───────────────────────────────────────────

let missionCounter = 0;

function generateMissionId(): MissionId {
  return `mission_${Date.now()}_${++missionCounter}_${Math.random().toString(36).substring(2, 8)}`;
}

// ─── SuperOrchestrator ───────────────────────────────────────

export class SuperOrchestrator {
  private readonly eventBus: EventBus;
  private readonly workflowManager: WorkflowManager;
  private readonly memoryStore: MemoryStore;
  private readonly knowledgeStore: KnowledgeStore;
  private readonly reflectionEngine: ReflectionEngine;
  private readonly learningEngine: LearningEngine;
  private readonly costOptimizer: CostOptimizer;
  private readonly logger: Logger;
  private readonly config: Required<OrchestratorConfig>;

  /** Active and completed missions */
  private readonly missions: Map<MissionId, Mission> = new Map();

  /** Agent registry — maps agent types to task handler types */
  private readonly agentRegistry: Map<string, string> = new Map();

  constructor(deps: OrchestratorDeps, config?: OrchestratorConfig) {
    this.eventBus = deps.eventBus;
    this.workflowManager = deps.workflowManager;
    this.memoryStore = deps.memoryStore;
    this.knowledgeStore = deps.knowledgeStore;
    this.reflectionEngine = deps.reflectionEngine;
    this.learningEngine = deps.learningEngine;
    this.costOptimizer = deps.costOptimizer;
    this.logger = deps.logger;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.logger.info('SuperOrchestrator initialized', {
      autoReflect: this.config.autoReflect,
      autoMemory: this.config.autoMemory,
      autoKnowledge: this.config.autoKnowledge,
      autoLearning: this.config.autoLearning,
    });
  }

  // ─── Mission Lifecycle ─────────────────────────────────────

  /**
   * Submit a new mission for execution.
   * Parses the description, creates a plan, and returns the mission.
   * Does NOT start execution — call executeMission() separately.
   */
  async submitMission(description: string, options?: MissionOptions): Promise<Mission> {
    // Parse the mission description
    const parsed = parseMission(description);

    // Determine mission type (option overrides auto-detected)
    const type = options?.type ?? parsed.type;

    // Build constraints from options and parsed data
    const constraints = this.buildConstraints(options?.constraints, parsed.constraints);

    // Create the mission object
    const mission: Mission = {
      id: generateMissionId(),
      description,
      type,
      parameters: options?.parameters ?? {},
      constraints,
      priority: options?.priority ?? 'normal',
      status: 'pending',
      createdAt: new Date().toISOString(),
      metadata: options?.metadata,
    };

    // Store the mission
    this.missions.set(mission.id, mission);

    // Emit event
    await this.emitEvent('mission.submitted', {
      missionId: mission.id,
      type: mission.type,
    });

    this.logger.info('Mission submitted', {
      missionId: mission.id,
      type: mission.type,
      priority: mission.priority,
    });

    return mission;
  }

  /**
   * Cancel a mission.
   * Only pending or planning missions can be cancelled.
   * If the mission is executing, cancels the underlying workflow.
   */
  async cancelMission(missionId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    if (mission.status === 'completed' || mission.status === 'failed' || mission.status === 'cancelled') {
      throw new Error(`Cannot cancel mission in status: ${mission.status}`);
    }

    // If the mission is executing, cancel the workflow
    if (mission.status === 'executing' && mission.workflowId) {
      try {
        await this.workflowManager.cancel(mission.workflowId);
      } catch (error) {
        this.logger.warn('Failed to cancel workflow', {
          missionId,
          workflowId: mission.workflowId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Update mission status
    mission.status = 'cancelled';
    mission.completedAt = new Date().toISOString();

    // Emit event
    await this.emitEvent('mission.cancelled', { missionId });

    this.logger.info('Mission cancelled', { missionId });
  }

  /**
   * Get a mission by ID.
   */
  async getMission(missionId: string): Promise<Mission | null> {
    return this.missions.get(missionId) ?? null;
  }

  /**
   * List missions, optionally filtered by status or type.
   */
  async listMissions(filter?: { status?: MissionStatus; type?: MissionType }): Promise<Mission[]> {
    let missions = Array.from(this.missions.values());

    if (filter?.status) {
      missions = missions.filter((m) => m.status === filter.status);
    }
    if (filter?.type) {
      missions = missions.filter((m) => m.type === filter.type);
    }

    // Sort by creation date descending (newest first)
    missions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return missions;
  }

  // ─── Planning ──────────────────────────────────────────────

  /**
   * Create an execution plan for a mission.
   * Uses template-based planning for Phase 1.
   */
  async createPlan(mission: Mission): Promise<MissionPlan> {
    // Update status
    mission.status = 'planning';

    await this.emitEvent('mission.planning', { missionId: mission.id });

    this.logger.info('Creating plan for mission', {
      missionId: mission.id,
      type: mission.type,
    });

    // Parse the mission description
    const parsed = parseMission(mission.description);

    // Create the plan using the planner
    const plan = createPlan(mission, parsed);

    // Store the plan on the mission
    mission.plan = plan;

    this.logger.info('Plan created', {
      missionId: mission.id,
      stepCount: plan.steps.length,
      estimatedCost: plan.estimatedCostUsd,
      estimatedDuration: plan.estimatedDurationMs,
      estimatedQuality: plan.estimatedQualityScore,
    });

    return plan;
  }

  // ─── Execution ─────────────────────────────────────────────

  /**
   * Execute a mission: plan → DAG → workflow → result.
   * This is the main entry point for mission execution.
   */
  async executeMission(missionId: string): Promise<MissionResult> {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    if (mission.status !== 'pending' && mission.status !== 'planning') {
      throw new Error(`Cannot execute mission in status: ${mission.status}`);
    }

    const startTime = Date.now();

    try {
      // Phase 1: Planning (if not already planned)
      if (!mission.plan) {
        await this.createPlan(mission);
      }

      // Phase 2: DAG Generation
      const dag = this.generateDAGFromPlan(mission.plan!);

      // Register the DAG with the workflow manager
      this.workflowManager.register(dag);

      // Phase 3: Execution
      mission.status = 'executing';
      mission.startedAt = new Date().toISOString();
      mission.workflowId = dag.id;

      await this.emitEvent('mission.executing', {
        missionId: mission.id,
        workflowId: dag.id,
      });

      this.logger.info('Executing mission', {
        missionId: mission.id,
        dagId: dag.id,
      });

      // Register mock task handlers for all agent types used in the plan
      this.registerMockHandlers(mission.plan!);

      // Start the workflow
      const execution = await this.workflowManager.start(
        dag.id,
        {
          missionId: mission.id,
          description: mission.description,
          parameters: mission.parameters,
        },
      );

      // Build the result from the workflow execution
      const result = this.buildResult(mission, execution, startTime);

      // Update mission
      mission.result = result;
      mission.status = result.status === 'success' ? 'completed' : 'failed';
      mission.completedAt = new Date().toISOString();

      // Emit event
      if (result.status === 'success' || result.status === 'partial') {
        await this.emitEvent('mission.completed', {
          missionId: mission.id,
          qualityScore: result.qualityScore,
          costUsd: result.costUsd,
        });
      } else {
        await this.emitEvent('mission.failed', {
          missionId: mission.id,
          error: result.errors.join('; '),
        });
      }

      // Phase 4: Post-execution integration
      await this.postExecution(mission, result);

      return result;
    } catch (error) {
      // Handle unexpected errors
      const result: MissionResult = {
        missionId: mission.id,
        status: 'failure',
        qualityScore: 0,
        costUsd: 0,
        durationMs: Date.now() - startTime,
        deliverables: [],
        errors: [error instanceof Error ? error.message : String(error)],
      };

      mission.result = result;
      mission.status = 'failed';
      mission.completedAt = new Date().toISOString();

      await this.emitEvent('mission.failed', {
        missionId: mission.id,
        error: result.errors[0] ?? 'Unknown error',
      });

      this.logger.error('Mission execution failed', error instanceof Error ? error : new Error(String(error)), {
        missionId: mission.id,
      });

      return result;
    }
  }

  // ─── Agent Registry ────────────────────────────────────────

  /**
   * Register an agent type mapping.
   * Maps an agentType (used in templates) to a workflow task handler type.
   */
  registerAgent(agentType: string, taskHandlerType: string): void {
    this.agentRegistry.set(agentType, taskHandlerType);
    this.logger.debug('Agent registered', { agentType, taskHandlerType });
  }

  /**
   * Unregister an agent type mapping.
   */
  unregisterAgent(agentType: string): void {
    this.agentRegistry.delete(agentType);
  }

  /**
   * Get all registered agent type mappings.
   */
  getRegisteredAgents(): Map<string, string> {
    return new Map(this.agentRegistry);
  }

  // ─── Internal Methods ──────────────────────────────────────

  /**
   * Parse a mission description into structured data.
   */
  private parseMissionDescription(description: string): ParsedMission {
    return parseMission(description);
  }

  /**
   * Generate a DAG from a mission plan.
   */
  private generateDAGFromPlan(plan: MissionPlan) {
    return generateDAG(plan);
  }

  /**
   * Select the agent for a plan step.
   * In Phase 1, uses the agentType directly from the step definition.
   */
  private selectAgent(step: { agentType: string }): string {
    // Check if there's a registered mapping
    const mapped = this.agentRegistry.get(step.agentType);
    if (mapped) {
      return mapped;
    }
    // Default: use the agentType as the task handler type
    return step.agentType;
  }

  /**
   * Build a MissionResult from a WorkflowExecution.
   */
  private buildResult(
    mission: Mission,
    execution: WorkflowExecution,
    startTime: number,
  ): MissionResult {
    const errors: string[] = [];
    const deliverables: Deliverable[] = [];
    let qualityScore = 0;
    let costUsd = 0;

    // Process node results
    for (const [_nodeId, nodeResult] of execution.nodeResults) {
      if (nodeResult.status === 'failed' && nodeResult.error) {
        errors.push(nodeResult.error);
      }

      // Extract deliverables from node outputs
      if (nodeResult.output && typeof nodeResult.output === 'object') {
        const output = nodeResult.output as Record<string, unknown>;
        if (output.deliverable) {
          deliverables.push(output.deliverable as Deliverable);
        }
        if (output.qualityScore && typeof output.qualityScore === 'number') {
          qualityScore = Math.max(qualityScore, output.qualityScore);
        }
        if (output.costUsd && typeof output.costUsd === 'number') {
          costUsd += output.costUsd;
        }
      }
    }

    // Default quality score based on execution status
    if (qualityScore === 0) {
      qualityScore = execution.status === 'completed' ? 75 : 0;
    }

    // Default cost from plan estimate
    if (costUsd === 0 && mission.plan) {
      costUsd = mission.plan.estimatedCostUsd;
    }

    // Determine result status
    let status: MissionResult['status'];
    if (execution.status === 'completed' && errors.length === 0) {
      status = 'success';
    } else if (execution.status === 'completed' && errors.length > 0) {
      status = 'partial';
    } else {
      status = 'failure';
    }

    return {
      missionId: mission.id,
      status,
      qualityScore,
      costUsd,
      durationMs: Date.now() - startTime,
      deliverables,
      errors,
    };
  }

  /**
   * Reflect on the mission result using the Reflection Engine.
   */
  private async reflectOnResult(result: MissionResult): Promise<string> {
    try {
      // Add the execution outcome as a strategy for reflection
      this.reflectionEngine.addStrategy({
        id: `outcome_${result.missionId}`,
        name: `Mission ${result.missionId} Outcome`,
        description: `Quality: ${result.qualityScore}, Cost: $${result.costUsd}, Duration: ${result.durationMs}ms`,
        approach: result.status === 'success'
          ? 'Mission completed successfully'
          : `Mission encountered issues: ${result.errors.join(', ')}`,
        estimatedQuality: result.qualityScore,
        estimatedCost: result.costUsd,
        estimatedDuration: result.durationMs,
      });

      // Add a "what could have been better" strategy
      this.reflectionEngine.addStrategy({
        id: `improvement_${result.missionId}`,
        name: `Potential Improvement`,
        description: 'Alternative approach that could improve quality or reduce cost',
        approach: 'Consider using different models or breaking tasks into smaller steps',
        estimatedQuality: Math.min(100, result.qualityScore + 10),
        estimatedCost: result.costUsd * 0.8,
        estimatedDuration: result.durationMs * 0.9,
      });

      // Add criteria for reflection
      this.reflectionEngine.addCriteria({
        name: 'quality',
        weight: 0.4,
        evaluate: (strategy) => strategy.estimatedQuality ?? 50,
      });
      this.reflectionEngine.addCriteria({
        name: 'cost_efficiency',
        weight: 0.3,
        evaluate: (strategy) => {
          const cost = strategy.estimatedCost ?? 1;
          return Math.max(0, 100 - cost * 100);
        },
      });
      this.reflectionEngine.addCriteria({
        name: 'speed',
        weight: 0.3,
        evaluate: (strategy) => {
          const duration = strategy.estimatedDuration ?? 60000;
          return Math.max(0, 100 - duration / 60000 * 10);
        },
      });

      // Run reflection if we have enough strategies
      try {
        const reflectionResult = await this.reflectionEngine.reflect();
        await this.emitEvent('mission.reflected', {
          missionId: result.missionId,
          reflections: reflectionResult.reasoning,
        });
        return reflectionResult.reasoning;
      } catch {
        // Not enough strategies — return a simple summary
        const summary = `Mission ${result.missionId}: ${result.status} (quality: ${result.qualityScore}, cost: $${result.costUsd})`;
        return summary;
      }
    } catch (error) {
      this.logger.warn('Reflection failed', {
        missionId: result.missionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return `Reflection unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Record the mission outcome in the Learning Engine.
   */
  private async recordOutcome(result: MissionResult, missionType: string): Promise<void> {
    try {
      await this.learningEngine.recordOutcome({
        id: `outcome_${result.missionId}`,
        missionType,
        missionId: result.missionId,
        status: result.status === 'success' ? 'success' : result.status === 'partial' ? 'partial' : 'failure',
        qualityScore: result.qualityScore,
        costUsd: result.costUsd,
        durationMs: result.durationMs,
        modelUsed: 'template-based', // Phase 1 default
        agentsUsed: [],
        corrections: result.errors.length,
        errorTypes: result.errors.length > 0 ? ['execution_error'] : [],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn('Failed to record outcome', {
        missionId: result.missionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Post-execution integration:
   * - Reflect on results
   * - Store in memory
   * - Archive deliverables in knowledge
   * - Record outcome for learning
   */
  private async postExecution(mission: Mission, result: MissionResult): Promise<void> {
    // Save the final status — we temporarily change it during reflection
    const finalStatus = mission.status;

    // 1. Reflect
    if (this.config.autoReflect) {
      mission.status = 'reflecting';
      const reflections = await this.reflectOnResult(result);
      result.reflections = reflections;
    }

    // Restore the final status after reflection
    mission.status = finalStatus;

    // 2. Store in memory
    if (this.config.autoMemory) {
      try {
        await this.memoryStore.store(
          'workflow',
          `mission_${mission.id}`,
          {
            id: mission.id,
            type: mission.type,
            status: result.status,
            qualityScore: result.qualityScore,
            costUsd: result.costUsd,
            durationMs: result.durationMs,
            reflections: result.reflections,
          },
          {
            tags: ['mission', mission.type, result.status],
            metadata: { missionId: mission.id },
          },
        );
      } catch (error) {
        this.logger.warn('Failed to store mission in memory', {
          missionId: mission.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 3. Archive deliverables in knowledge
    if (this.config.autoKnowledge && result.deliverables.length > 0) {
      try {
        for (const deliverable of result.deliverables) {
          await this.knowledgeStore.create({
            type: this.mapDeliverableType(deliverable.type),
            title: `${mission.type} mission: ${deliverable.name}`,
            content: deliverable.content ?? '',
            tags: ['mission', mission.type, deliverable.type],
            category: mission.type,
            status: 'published',
            source: {
              type: 'agent',
              reference: mission.id,
            },
            metadata: {
              missionId: mission.id,
              deliverableType: deliverable.type,
            },
          });
        }
      } catch (error) {
        this.logger.warn('Failed to archive deliverables', {
          missionId: mission.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 4. Record outcome for learning
    if (this.config.autoLearning) {
      await this.recordOutcome(result, mission.type);
    }
  }

  /**
   * Register mock task handlers for all agent types in a plan.
   * In Phase 1, these are simple pass-through handlers.
   * Phase 2 will replace these with real agent implementations.
   */
  private registerMockHandlers(plan: MissionPlan): void {
    for (const step of plan.steps) {
      const taskHandlerType = this.selectAgent(step);

      // Only register if not already registered
      try {
        this.workflowManager.registerTaskHandler(taskHandlerType, async (context) => {
          this.logger.debug('Mock handler executing step', {
            stepId: context.node.id,
            stepName: context.node.name,
            agentType: taskHandlerType,
          });

          // Mock handler returns a simple result
          return {
            stepId: context.node.id,
            stepName: context.node.name,
            agentType: taskHandlerType,
            status: 'completed',
            output: context.input,
            timestamp: new Date().toISOString(),
          };
        });
      } catch {
        // Handler may already be registered — that's fine
      }
    }
  }

  /**
   * Build constraints from options and parsed data.
   */
  private buildConstraints(
    optionsConstraints?: MissionConstraints,
    parsedConstraints?: MissionConstraints,
  ): MissionConstraints {
    const constraints: MissionConstraints = {};

    // Start with defaults
    constraints.maxBudgetUsd = this.config.defaultMaxBudgetUsd;
    constraints.maxDurationMs = this.config.defaultMaxDurationMs;
    constraints.minQualityScore = this.config.defaultMinQualityScore;

    // Apply parsed constraints (lower priority)
    if (parsedConstraints) {
      if (parsedConstraints.maxBudgetUsd !== undefined) constraints.maxBudgetUsd = parsedConstraints.maxBudgetUsd;
      if (parsedConstraints.maxDurationMs !== undefined) constraints.maxDurationMs = parsedConstraints.maxDurationMs;
      if (parsedConstraints.minQualityScore !== undefined) constraints.minQualityScore = parsedConstraints.minQualityScore;
      if (parsedConstraints.requiredFormats) constraints.requiredFormats = parsedConstraints.requiredFormats;
      if (parsedConstraints.language) constraints.language = parsedConstraints.language;
      if (parsedConstraints.deadline) constraints.deadline = parsedConstraints.deadline;
    }

    // Apply explicit constraints (highest priority)
    if (optionsConstraints) {
      if (optionsConstraints.maxBudgetUsd !== undefined) constraints.maxBudgetUsd = optionsConstraints.maxBudgetUsd;
      if (optionsConstraints.maxDurationMs !== undefined) constraints.maxDurationMs = optionsConstraints.maxDurationMs;
      if (optionsConstraints.minQualityScore !== undefined) constraints.minQualityScore = optionsConstraints.minQualityScore;
      if (optionsConstraints.requiredFormats) constraints.requiredFormats = optionsConstraints.requiredFormats;
      if (optionsConstraints.language) constraints.language = optionsConstraints.language;
      if (optionsConstraints.deadline) constraints.deadline = optionsConstraints.deadline;
    }

    return constraints;
  }

  /**
   * Map a deliverable type to a knowledge document type.
   */
  private mapDeliverableType(
    type: string,
  ): 'pdf' | 'docx' | 'markdown' | 'html' | 'article' | 'code' | 'note' {
    const mapping: Record<string, 'pdf' | 'docx' | 'markdown' | 'html' | 'article' | 'code' | 'note'> = {
      pdf: 'pdf',
      docx: 'docx',
      pptx: 'note',
      markdown: 'markdown',
      html: 'html',
      data: 'note',
      report: 'article',
      code: 'code',
    };
    return mapping[type] ?? 'note';
  }

  /**
   * Emit an orchestrator event through the EventBus.
   */
  private async emitEvent(
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.eventBus.emit({
        type,
        payload,
        source: 'super-orchestrator',
      });
    } catch (error) {
      this.logger.warn('Failed to emit event', {
        eventType: type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ─── Utility Methods ──────────────────────────────────────

  /**
   * Get the current configuration.
   */
  getConfig(): Required<OrchestratorConfig> {
    return { ...this.config };
  }

  /**
   * Get statistics about missions.
   */
  getStats(): {
    total: number;
    byStatus: Record<MissionStatus, number>;
    byType: Partial<Record<MissionType, number>>;
  } {
    const missions = Array.from(this.missions.values());

    const byStatus: Record<MissionStatus, number> = {
      pending: 0,
      planning: 0,
      executing: 0,
      reflecting: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    const byType: Partial<Record<MissionType, number>> = {};

    for (const mission of missions) {
      byStatus[mission.status]++;
      byType[mission.type] = (byType[mission.type] ?? 0) + 1;
    }

    return { total: missions.length, byStatus, byType };
  }

  /**
   * Reset the orchestrator — clear all missions and agent registrations.
   */
  reset(): void {
    this.missions.clear();
    this.agentRegistry.clear();
    this.logger.info('Orchestrator reset');
  }
}
