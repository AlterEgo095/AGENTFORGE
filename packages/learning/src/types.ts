/**
 * ALTER EGO OS — Learning Engine Types
 *
 * The Learning Engine records outcomes from every mission to improve future ones.
 * It discovers patterns, predicts cost/quality/duration, and generates insights.
 */

// ─── Outcome Types ───────────────────────────────────────────

/** Status of a mission outcome */
export type OutcomeStatus = 'success' | 'failure' | 'partial';

/** A recorded mission outcome */
export interface MissionOutcome {
  /** Unique outcome identifier */
  id: string;
  /** Type of mission (e.g., 'code-generation', 'refactoring', 'testing') */
  missionType: string;
  /** ID of the specific mission instance */
  missionId: string;
  /** Whether the mission succeeded, failed, or partially succeeded */
  status: OutcomeStatus;
  /** Quality score of the outcome (0-100) */
  qualityScore: number;
  /** Cost in USD */
  costUsd: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** LLM model used */
  modelUsed: string;
  /** Agent IDs that were involved */
  agentsUsed: string[];
  /** Number of corrections needed during the mission */
  corrections: number;
  /** Types of errors encountered */
  errorTypes: string[];
  /** When the outcome was recorded (ISO 8601) */
  timestamp: string;
  /** Arbitrary metadata for extensions */
  metadata?: Record<string, unknown>;
}

// ─── Learning Pattern ────────────────────────────────────────

/** A discovered pattern from historical outcomes */
export interface LearningPattern {
  /** Description of the discovered pattern */
  pattern: string;
  /** Mission type this pattern applies to */
  missionType: string;
  /** How frequently this pattern occurs */
  frequency: number;
  /** Average quality score for this pattern */
  avgQuality: number;
  /** Average cost in USD for this pattern */
  avgCost: number;
  /** Average duration in milliseconds for this pattern */
  avgDuration: number;
  /** Success rate (0-1) for this pattern */
  successRate: number;
}

// ─── Prediction ──────────────────────────────────────────────

/** A prediction for a future mission */
export interface Prediction {
  /** Mission type being predicted */
  missionType: string;
  /** Estimated cost in USD */
  estimatedCost: number;
  /** Estimated duration in milliseconds */
  estimatedDuration: number;
  /** Estimated quality score (0-100) */
  estimatedQuality: number;
  /** Confidence level of the prediction (0-1) */
  confidence: number;
  /** Number of past outcomes this prediction is based on */
  basedOnOutcomes: number;
}

// ─── Learning Insight ────────────────────────────────────────

/** An actionable insight generated from accumulated learning data */
export interface LearningInsight {
  /** Category of insight */
  type: 'optimization' | 'warning' | 'best_practice';
  /** Human-readable description */
  description: string;
  /** Evidence supporting this insight */
  evidence: string;
  /// Impact level
  impact: 'low' | 'medium' | 'high';
}

// ─── Learning Stats ──────────────────────────────────────────

/** Statistics about the learning engine's accumulated knowledge */
export interface LearningStats {
  /** Total number of outcomes recorded */
  totalOutcomes: number;
  /** Number of unique mission types seen */
  missionTypes: number;
  /** Number of patterns discovered */
  patternCount: number;
  /** Number of insights generated */
  insightCount: number;
  /** Overall success rate (0-1) */
  overallSuccessRate: number;
  /** Average quality across all outcomes */
  avgQuality: number;
  /** Average cost across all outcomes */
  avgCost: number;
  /** Average duration across all outcomes */
  avgDuration: number;
  /** Prediction accuracy metrics */
  predictionAccuracy: {
    /** Number of predictions made */
    totalPredictions: number;
    /** Average absolute error in cost prediction (USD) */
    avgCostError: number;
    /** Average absolute error in quality prediction (0-100) */
    avgQualityError: number;
    /** Average absolute error in duration prediction (ms) */
    avgDurationError: number;
  };
}

// ─── Learning Events ─────────────────────────────────────────

/** Event types emitted by the learning engine */
export type LearningEventType =
  | 'learning.outcome.recorded'
  | 'learning.pattern.discovered'
  | 'learning.insight.generated';

/** Event payloads for learning events */
export interface LearningEventPayloads {
  'learning.outcome.recorded': {
    outcomeId: string;
    missionType: string;
    status: OutcomeStatus;
  };
  'learning.pattern.discovered': {
    pattern: string;
    missionType: string;
    frequency: number;
  };
  'learning.insight.generated': {
    type: LearningInsight['type'];
    description: string;
    impact: LearningInsight['impact'];
  };
}

// ─── Engine Configuration ────────────────────────────────────

/** Configuration for the LearningEngine */
export interface LearningConfig {
  /** Minimum number of outcomes required before generating predictions (default: 3) */
  minOutcomesForPrediction?: number;
  /** Maximum number of outcomes to keep in memory (default: 10000) */
  maxOutcomes?: number;
  /** Whether to auto-discover patterns on outcome recording (default: true) */
  autoDiscoverPatterns?: boolean;
}
