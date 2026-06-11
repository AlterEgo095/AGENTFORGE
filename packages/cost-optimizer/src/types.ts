/**
 * ALTER EGO OS — Cost Optimizer Types
 *
 * Core type definitions for the LLM cost optimization system.
 * Selects the optimal model for each task based on quality, cost, and speed.
 */

// ─── Identifier Types ────────────────────────────────────────

/** Unique identifier for an LLM model */
export type ModelId = string;

// ─── Model Profile ───────────────────────────────────────────

/** Complete profile of an LLM model including cost and quality metrics */
export interface ModelProfile {
  /** Unique model identifier */
  id: ModelId;
  /** Human-readable model name */
  name: string;
  /** Provider (e.g., 'openai', 'anthropic', 'google') */
  provider: string;
  /** Cost per 1,000 input tokens in USD */
  costPer1kInputTokens: number;
  /** Cost per 1,000 output tokens in USD */
  costPer1kOutputTokens: number;
  /** Maximum context window in tokens */
  maxTokens: number;
  /** Quality benchmark score 0-100 */
  qualityScore: number;
  /** Speed benchmark score 0-100 */
  speedScore: number;
  /** Capability tags (e.g., 'code', 'writing', 'research', 'analysis') */
  capabilities: string[];
}

// ─── Model Selection ─────────────────────────────────────────

/** Result of model selection for a task */
export interface ModelSelection {
  /** The selected model ID */
  modelId: ModelId;
  /** Estimated cost in USD for this task */
  estimatedCost: number;
  /** Estimated quality score for this task */
  estimatedQuality: number;
  /** Explanation of why this model was selected */
  reasoning: string;
  /** Alternative model IDs that could also handle this task */
  alternatives: ModelId[];
}

// ─── Cost Constraints ────────────────────────────────────────

/** Constraints that limit model selection */
export interface CostConstraint {
  /** Maximum cost per single request in USD */
  maxCostPerRequest?: number;
  /** Maximum cost per mission in USD */
  maxCostPerMission?: number;
  /** Minimum acceptable quality score (0-100) */
  minQualityScore?: number;
  /** Preferred LLM providers */
  preferredProviders?: string[];
  /** Required capability tags */
  requiredCapabilities?: string[];
}

// ─── Task Description ────────────────────────────────────────

/** Description of a task that needs a model assignment */
export interface TaskDescription {
  /** Type of task (e.g., 'code', 'writing', 'research', 'analysis') */
  type: string;
  /** Estimated input tokens */
  estimatedInputTokens: number;
  /** Estimated output tokens */
  estimatedOutputTokens: number;
  /** Required quality level 0-100 (higher = more precise needed) */
  qualityRequirement: number;
  /** Required speed level 0-100 (higher = faster needed) */
  speedRequirement?: number;
  /** Human-readable task description */
  description?: string;
}

// ─── Usage Record ────────────────────────────────────────────

/** Record of actual model usage for cost tracking */
export interface UsageRecord {
  /** Agent that used the model */
  agentId: string;
  /** Mission the usage belongs to */
  missionId: string;
  /** Model used */
  modelId: ModelId;
  /** Actual input tokens consumed */
  inputTokens: number;
  /** Actual output tokens consumed */
  outputTokens: number;
  /** Actual cost in USD */
  actualCost: number;
  /** ISO 8601 timestamp */
  timestamp: string;
}

// ─── Cost Report ─────────────────────────────────────────────

/** Aggregated cost report for a time period */
export interface CostReport {
  /** Total cost in USD */
  totalCostUsd: number;
  /** Cost broken down by model */
  costByModel: Record<ModelId, number>;
  /** Cost broken down by agent */
  costByAgent: Record<string, number>;
  /** Cost broken down by mission */
  costByMission: Record<string, number>;
  /** Estimated savings from optimization vs always using the best model */
  savingsFromOptimization: number;
  /** Time period covered */
  period: { from: string; to: string };
}

// ─── Cost Optimizer Events ───────────────────────────────────

/** Event emitted when a model is selected */
export interface ModelSelectedEvent {
  modelId: ModelId;
  taskType: string;
  estimatedCost: number;
  estimatedQuality: number;
}

/** Event emitted when usage is recorded */
export interface UsageRecordedEvent {
  agentId: string;
  missionId: string;
  modelId: ModelId;
  actualCost: number;
}
