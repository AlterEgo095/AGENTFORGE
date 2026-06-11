/**
 * ALTER EGO OS — Super Orchestrator Types
 *
 * The Super Orchestrator is the BRAIN of the OS. It receives missions,
 * decomposes them into plans, creates workflow DAGs, and delegates
 * execution to specialized agents via the Workflow Engine.
 *
 * It NEVER produces content directly — it always delegates.
 */

// ─── Identifiers & Status ────────────────────────────────────

/** Unique identifier for a mission */
export type MissionId = string;

/** Mission lifecycle status */
export type MissionStatus =
  | 'pending'
  | 'planning'
  | 'executing'
  | 'reflecting'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Type of mission — determines which template to use */
export type MissionType =
  | 'formation'
  | 'research'
  | 'article'
  | 'presentation'
  | 'audit'
  | 'deployment'
  | 'monitoring'
  | 'analysis'
  | 'custom';

/** Priority levels for missions */
export type MissionPriority = 'critical' | 'high' | 'normal' | 'low';

// ─── Mission ─────────────────────────────────────────────────

/** A mission is the top-level unit of work for the Orchestrator */
export interface Mission {
  /** Unique mission identifier */
  id: MissionId;
  /** Human-readable description of the mission */
  description: string;
  /** Type of mission (determines planning template) */
  type: MissionType;
  /** Arbitrary parameters for the mission */
  parameters: Record<string, unknown>;
  /** Constraints on the mission execution */
  constraints?: MissionConstraints;
  /** Mission priority */
  priority: MissionPriority;
  /** Current lifecycle status */
  status: MissionStatus;
  /** The execution plan (set after planning phase) */
  plan?: MissionPlan;
  /** ID of the workflow execution (set after execution starts) */
  workflowId?: string;
  /** The result of the mission (set after execution completes) */
  result?: MissionResult;
  /** When the mission was created */
  createdAt: string;
  /** When the mission started executing */
  startedAt?: string;
  /** When the mission completed */
  completedAt?: string;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/** Constraints that limit how a mission can be executed */
export interface MissionConstraints {
  /** Maximum budget in USD */
  maxBudgetUsd?: number;
  /** Maximum duration in milliseconds */
  maxDurationMs?: number;
  /** Minimum acceptable quality score (0-100) */
  minQualityScore?: number;
  /** Required output formats */
  requiredFormats?: string[];
  /** Language for deliverables */
  language?: string;
  /** Deadline (ISO 8601) */
  deadline?: string;
}

/** Options when submitting a new mission */
export interface MissionOptions {
  /** Mission type override (auto-detected if not specified) */
  type?: MissionType;
  /** Mission parameters */
  parameters?: Record<string, unknown>;
  /** Constraints */
  constraints?: MissionConstraints;
  /** Priority (default: 'normal') */
  priority?: MissionPriority;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

// ─── Planning ────────────────────────────────────────────────

/** A plan decomposing a mission into ordered steps */
export interface MissionPlan {
  /** The mission this plan belongs to */
  missionId: MissionId;
  /** Ordered list of steps to execute */
  steps: PlanStep[];
  /** Dependencies between steps */
  dependencies: StepDependency[];
  /** Estimated total cost in USD */
  estimatedCostUsd: number;
  /** Estimated total duration in milliseconds */
  estimatedDurationMs: number;
  /** Estimated quality score (0-100) */
  estimatedQualityScore: number;
}

/** A single step in a mission plan */
export interface PlanStep {
  /** Unique step identifier */
  id: string;
  /** Human-readable step name */
  name: string;
  /** Detailed description of what this step does */
  description: string;
  /** Which agent type should handle this step */
  agentType: string;
  /** Input data for this step */
  input: Record<string, unknown>;
  /** Additional configuration */
  config?: Record<string, unknown>;
  /** Retry policy for this step */
  retryPolicy?: {
    maxAttempts: number;
    delayMs: number;
    backoff: 'linear' | 'exponential';
  };
  /** Quality gate for this step */
  qualityGate?: {
    minScore: number;
    onFailure: 'retry' | 'skip' | 'fail';
  };
}

/** A dependency between two steps */
export interface StepDependency {
  /** Source step ID (must complete before target) */
  from: string;
  /** Target step ID (depends on source) */
  to: string;
}

// ─── Results ─────────────────────────────────────────────────

/** Result of a completed mission */
export interface MissionResult {
  /** The mission this result belongs to */
  missionId: MissionId;
  /** Overall result status */
  status: 'success' | 'partial' | 'failure';
  /** Quality score (0-100) */
  qualityScore: number;
  /** Total cost in USD */
  costUsd: number;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Deliverables produced by the mission */
  deliverables: Deliverable[];
  /** Errors encountered during execution */
  errors: string[];
  /** Reflection summary (set after reflection phase) */
  reflections?: string;
}

/** A deliverable produced by a mission */
export interface Deliverable {
  /** Type of deliverable */
  type: 'pdf' | 'docx' | 'pptx' | 'markdown' | 'html' | 'data' | 'report' | 'code';
  /** Human-readable name */
  name: string;
  /** File path (if persisted) */
  path?: string;
  /** Inline content (if not persisted to a file) */
  content?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ─── Mission Parsing ─────────────────────────────────────────

/** Parsed mission — structured data extracted from a natural language description */
export interface ParsedMission {
  /** Detected mission type */
  type: MissionType;
  /** Extracted intent / goal */
  intent: string;
  /** Scope of the mission */
  scope: string[];
  /** Extracted constraints */
  constraints: MissionConstraints;
  /** Expected deliverables */
  deliverables: string[];
  /** Keywords extracted from the description */
  keywords: string[];
  /** Confidence of the parsing (0-1) */
  confidence: number;
}

// ─── Mission Template ────────────────────────────────────────

/** A pre-defined template for a mission type */
export interface MissionTemplate {
  /** The mission type this template handles */
  type: MissionType;
  /** Human-readable name */
  name: string;
  /** Description of when to use this template */
  description: string;
  /** Default steps for this template */
  steps: Omit<PlanStep, 'id'>[];
  /** Default dependencies between steps */
  dependencies: StepDependency[];
  /** Default estimated cost */
  estimatedCostUsd: number;
  /** Default estimated duration */
  estimatedDurationMs: number;
  /** Default estimated quality */
  estimatedQualityScore: number;
}

// ─── Orchestrator Events ─────────────────────────────────────

/** Event types emitted by the orchestrator */
export type OrchestratorEventType =
  | 'mission.submitted'
  | 'mission.planning'
  | 'mission.executing'
  | 'mission.completed'
  | 'mission.failed'
  | 'mission.reflected'
  | 'mission.cancelled';

/** Event payloads for orchestrator events */
export interface OrchestratorEventPayloads {
  'mission.submitted': { missionId: MissionId; type: MissionType };
  'mission.planning': { missionId: MissionId };
  'mission.executing': { missionId: MissionId; workflowId: string };
  'mission.completed': { missionId: MissionId; qualityScore: number; costUsd: number };
  'mission.failed': { missionId: MissionId; error: string };
  'mission.reflected': { missionId: MissionId; reflections: string };
  'mission.cancelled': { missionId: MissionId };
}

// ─── Orchestrator Dependencies ───────────────────────────────

/** Dependencies injected into the SuperOrchestrator */
export interface OrchestratorDeps {
  eventBus: import('@alterego/event-bus').EventBus;
  workflowManager: import('@alterego/workflow').WorkflowManager;
  memoryStore: import('@alterego/memory').MemoryStore;
  knowledgeStore: import('@alterego/knowledge').KnowledgeStore;
  reflectionEngine: import('@alterego/reflection').ReflectionEngine;
  learningEngine: import('@alterego/learning').LearningEngine;
  costOptimizer: import('@alterego/cost-optimizer').CostOptimizer;
  logger: import('@alterego/kernel').Logger;
}

// ─── Orchestrator Configuration ──────────────────────────────

/** Configuration for the SuperOrchestrator */
export interface OrchestratorConfig {
  /** Whether to automatically reflect after mission completion (default: true) */
  autoReflect?: boolean;
  /** Whether to automatically store results in memory (default: true) */
  autoMemory?: boolean;
  /** Whether to automatically archive deliverables in knowledge (default: true) */
  autoKnowledge?: boolean;
  /** Whether to automatically record outcomes for learning (default: true) */
  autoLearning?: boolean;
  /** Default quality gate minimum score (default: 70) */
  defaultMinQualityScore?: number;
  /** Default max budget in USD (default: 10) */
  defaultMaxBudgetUsd?: number;
  /** Default max duration in ms (default: 3600000 = 1 hour) */
  defaultMaxDurationMs?: number;
}
