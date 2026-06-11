/**
 * ALTER EGO OS — Reflection Engine Types
 *
 * The Reflection Engine ensures the system NEVER accepts the first solution.
 * It compares multiple strategies, evaluates candidates, scores and ranks them,
 * and can fuse the best aspects of multiple approaches.
 */
/** Unique identifier for a strategy */
export type StrategyId = string;
/** A candidate strategy for solving a problem */
export interface Strategy {
    /** Unique strategy identifier */
    id: StrategyId;
    /** Human-readable name */
    name: string;
    /** Detailed description of the strategy */
    description: string;
    /** Approach summary — how this strategy tackles the problem */
    approach: string;
    /** Estimated cost in USD */
    estimatedCost?: number;
    /** Estimated quality score (0-100) */
    estimatedQuality?: number;
    /** Estimated duration in milliseconds */
    estimatedDuration?: number;
    /** Risk level of this strategy */
    riskLevel?: 'low' | 'medium' | 'high';
    /** Arbitrary metadata for domain-specific extensions */
    metadata?: Record<string, unknown>;
}
/** A named, weighted criterion for evaluating strategies */
export interface EvaluationCriteria {
    /** Name of this criterion (e.g., 'cost', 'quality', 'security') */
    name: string;
    /** Weight of this criterion (0-1); all weights should sum to 1 */
    weight: number;
    /** Evaluation function — receives a strategy, returns a score 0-100 */
    evaluate: (strategy: Strategy) => number | Promise<number>;
}
/** Result of evaluating a single strategy against all criteria */
export interface EvaluationResult {
    /** The strategy that was evaluated */
    strategyId: StrategyId;
    /** Scores per criterion name */
    scores: Record<string, number>;
    /** Overall weighted score (0-100) */
    weightedScore: number;
    /** Rank among all evaluated strategies (1 = best) */
    rank: number;
}
/** Complete output of a reflection cycle */
export interface ReflectionResult {
    /** All strategies that were considered */
    strategies: Strategy[];
    /** Evaluation results for each strategy, sorted by rank */
    evaluations: EvaluationResult[];
    /** The ID of the recommended (top-ranked) strategy */
    recommendation: StrategyId;
    /** Optional fused strategy combining the best aspects of top strategies */
    fusion?: Strategy;
    /** Human-readable reasoning for the recommendation */
    reasoning: string;
    /** Timestamp of the reflection */
    timestamp: string;
}
/** Event types emitted by the reflection engine */
export type ReflectionEventType = 'reflection.completed';
/** Event payloads for reflection events */
export interface ReflectionEventPayloads {
    'reflection.completed': {
        recommendation: StrategyId;
        strategiesConsidered: number;
        topScore: number;
        fused: boolean;
    };
}
/** Configuration for the ReflectionEngine */
export interface ReflectionConfig {
    /** Minimum number of strategies required before reflection (default: 2) */
    minStrategies?: number;
    /** Number of top strategies to consider for fusion (default: 2) */
    fusionTopN?: number;
    /** Whether fusion is enabled by default (default: true) */
    fusionEnabled?: boolean;
}
//# sourceMappingURL=types.d.ts.map