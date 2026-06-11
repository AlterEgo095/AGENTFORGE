/**
 * ALTER EGO OS — Super Orchestrator
 *
 * The BRAIN of the Cognitive Personal OS.
 * Receives missions, decomposes them into plans, creates workflow DAGs,
 * and delegates execution to specialized agents via the Workflow Engine.
 *
 * Key principle: The Orchestrator NEVER produces content directly.
 * It always delegates to agents via the Workflow Engine.
 */

// ─── Main Class ──────────────────────────────────────────────

export { SuperOrchestrator } from './orchestrator.js';

// ─── Sub-modules ─────────────────────────────────────────────

export { parseMission } from './mission-parser.js';
export { createPlan } from './planner.js';
export { generateDAG, validateGeneratedDAG } from './dag-generator.js';
export { getTemplate, getAllTemplates, hasTemplate } from './templates.js';

// ─── Types ───────────────────────────────────────────────────

export type {
  // Identifiers & Status
  MissionId,
  MissionStatus,
  MissionType,
  MissionPriority,

  // Mission
  Mission,
  MissionConstraints,
  MissionOptions,

  // Planning
  MissionPlan,
  PlanStep,
  StepDependency,

  // Results
  MissionResult,
  Deliverable,

  // Parsing
  ParsedMission,

  // Templates
  MissionTemplate,

  // Events
  OrchestratorEventType,
  OrchestratorEventPayloads,

  // Dependencies
  OrchestratorDeps,

  // Configuration
  OrchestratorConfig,
} from './types.js';
