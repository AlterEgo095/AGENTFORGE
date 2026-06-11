/**
 * ALTER EGO OS — Planner
 *
 * Creates execution plans from parsed missions using templates.
 * Phase 1 is template-based only; Phase 2 will add LLM-based customization.
 *
 * The planner:
 * 1. Looks up the template for the mission type
 * 2. Creates PlanSteps with IDs from the template
 * 3. Applies mission-specific constraints and parameters
 * 4. Adjusts estimates based on constraints
 */

import type {
  Mission,
  MissionPlan,
  MissionConstraints,
  PlanStep,
  ParsedMission,
  StepDependency,
} from './types.js';
import { getTemplate } from './templates.js';

// ─── Default Estimates ───────────────────────────────────────

const DEFAULT_STEP_COST_USD = 0.15;
const DEFAULT_STEP_DURATION_MS = 60_000; // 1 minute per step
const DEFAULT_QUALITY_SCORE = 75;

// ─── Plan Creation ───────────────────────────────────────────

/**
 * Create a mission plan from a parsed mission.
 * Uses the template for the detected mission type and applies constraints.
 */
export function createPlan(
  mission: Mission,
  parsed: ParsedMission,
): MissionPlan {
  const template = getTemplate(parsed.type);

  // Create steps from the template with proper IDs
  const steps: PlanStep[] = template.steps.map((step, index) => ({
    ...step,
    id: `step_${index}`,
    input: {
      ...step.input,
      missionId: mission.id,
      missionDescription: mission.description,
      ...mission.parameters,
    },
  }));

  // Copy dependencies from the template
  const dependencies: StepDependency[] = [...template.dependencies];

  // Apply mission constraints to the plan
  const constraints = mergeConstraints(mission.constraints, parsed.constraints);

  // Apply quality gates if minQualityScore is specified
  if (constraints.minQualityScore !== undefined) {
    applyQualityGates(steps, constraints.minQualityScore);
  }

  // Apply retry policies for critical missions
  if (mission.priority === 'critical' || mission.priority === 'high') {
    applyRetryPolicies(steps, mission.priority);
  }

  // Calculate estimates (adjusted by constraints)
  const estimatedCostUsd = calculateCost(steps, template.estimatedCostUsd, constraints);
  const estimatedDurationMs = calculateDuration(steps, template.estimatedDurationMs, constraints);
  const estimatedQualityScore = calculateQuality(template.estimatedQualityScore, constraints);

  return {
    missionId: mission.id,
    steps,
    dependencies,
    estimatedCostUsd,
    estimatedDurationMs,
    estimatedQualityScore,
  };
}

// ─── Constraint Helpers ──────────────────────────────────────

/**
 * Merge mission constraints with parsed constraints.
 * Parsed constraints take lower precedence than explicitly set ones.
 */
function mergeConstraints(
  missionConstraints?: MissionConstraints,
  parsedConstraints?: MissionConstraints,
): MissionConstraints {
  const merged: MissionConstraints = {};

  // Start with parsed constraints
  if (parsedConstraints) {
    Object.assign(merged, parsedConstraints);
  }

  // Override with explicit mission constraints (higher priority)
  if (missionConstraints) {
    if (missionConstraints.maxBudgetUsd !== undefined) {
      merged.maxBudgetUsd = missionConstraints.maxBudgetUsd;
    }
    if (missionConstraints.maxDurationMs !== undefined) {
      merged.maxDurationMs = missionConstraints.maxDurationMs;
    }
    if (missionConstraints.minQualityScore !== undefined) {
      merged.minQualityScore = missionConstraints.minQualityScore;
    }
    if (missionConstraints.requiredFormats !== undefined) {
      merged.requiredFormats = missionConstraints.requiredFormats;
    }
    if (missionConstraints.language !== undefined) {
      merged.language = missionConstraints.language;
    }
    if (missionConstraints.deadline !== undefined) {
      merged.deadline = missionConstraints.deadline;
    }
  }

  return merged;
}

/**
 * Apply quality gates to steps that produce deliverables.
 */
function applyQualityGates(steps: PlanStep[], minScore: number): void {
  for (const step of steps) {
    // Apply quality gates to steps that produce important outputs
    if (
      step.agentType === 'writer' ||
      step.agentType === 'reviewer' ||
      step.agentType === 'analyst' ||
      step.agentType === 'assessor'
    ) {
      step.qualityGate = {
        minScore,
        onFailure: 'retry',
      };
    }
  }
}

/**
 * Apply retry policies based on mission priority.
 */
function applyRetryPolicies(steps: PlanStep[], priority: string): void {
  const maxAttempts = priority === 'critical' ? 5 : 3;
  const delayMs = priority === 'critical' ? 500 : 1000;

  for (const step of steps) {
    step.retryPolicy = {
      maxAttempts,
      delayMs,
      backoff: 'exponential',
    };
  }
}

// ─── Estimate Calculation ────────────────────────────────────

/**
 * Calculate estimated cost, considering budget constraints.
 */
function calculateCost(
  steps: PlanStep[],
  templateCost: number,
  constraints: MissionConstraints,
): number {
  let cost = templateCost;

  // If we have more steps than the template, adjust
  if (steps.length > 0 && templateCost === 0) {
    cost = steps.length * DEFAULT_STEP_COST_USD;
  }

  // Cap at budget if specified
  if (constraints.maxBudgetUsd !== undefined) {
    cost = Math.min(cost, constraints.maxBudgetUsd * 0.9); // Leave 10% buffer
  }

  return Math.round(cost * 100) / 100;
}

/**
 * Calculate estimated duration, considering time constraints.
 */
function calculateDuration(
  steps: PlanStep[],
  templateDuration: number,
  constraints: MissionConstraints,
): number {
  let duration = templateDuration;

  if (duration === 0 && steps.length > 0) {
    duration = steps.length * DEFAULT_STEP_DURATION_MS;
  }

  // Cap at max duration if specified
  if (constraints.maxDurationMs !== undefined) {
    duration = Math.min(duration, constraints.maxDurationMs * 0.9); // Leave 10% buffer
  }

  return duration;
}

/**
 * Calculate estimated quality, considering quality constraints.
 */
function calculateQuality(
  templateQuality: number,
  constraints: MissionConstraints,
): number {
  let quality = templateQuality;

  // If a minimum quality is required and our estimate is below it,
  // we adjust upward (indicating we'll use better models/approaches)
  if (constraints.minQualityScore !== undefined && quality < constraints.minQualityScore) {
    quality = constraints.minQualityScore;
  }

  return quality;
}
