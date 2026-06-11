/**
 * ALTER EGO OS — Reflection Engine Implementation
 *
 * The core engine that ensures the system NEVER accepts the first solution.
 * It compares multiple strategies against weighted criteria, ranks them,
 * and can fuse the best aspects of multiple approaches into a superior hybrid.
 *
 * All significant actions emit events through the EventBus.
 */
import type { EventBus } from '@alterego/event-bus';
import type { Strategy, StrategyId, EvaluationCriteria, EvaluationResult, ReflectionResult, ReflectionConfig } from './types.js';
export declare class ReflectionEngine {
    private readonly config;
    private readonly eventBus;
    private readonly strategies;
    private readonly criteria;
    private readonly history;
    constructor(eventBus?: EventBus, config?: ReflectionConfig);
    /**
     * Register a candidate strategy for evaluation.
     * If a strategy with the same ID already exists, it will be replaced.
     */
    addStrategy(strategy: Strategy): void;
    /**
     * Remove a strategy by ID.
     */
    removeStrategy(id: StrategyId): boolean;
    /**
     * Get a registered strategy by ID.
     */
    getStrategy(id: StrategyId): Strategy | undefined;
    /**
     * Get all registered strategies.
     */
    getStrategies(): Strategy[];
    /**
     * Clear all registered strategies.
     */
    clearStrategies(): void;
    /**
     * Register an evaluation criterion.
     * If a criterion with the same name already exists, it will be replaced.
     */
    addCriteria(criteria: EvaluationCriteria): void;
    /**
     * Remove a criterion by name.
     */
    removeCriteria(name: string): boolean;
    /**
     * Get all registered criteria.
     */
    getCriteria(): EvaluationCriteria[];
    /**
     * Clear all registered criteria.
     */
    clearCriteria(): void;
    /**
     * Evaluate all registered strategies against all registered criteria.
     * Returns unsorted evaluation results — each result includes the raw scores
     * and the weighted composite score.
     */
    evaluate(): Promise<EvaluationResult[]>;
    /**
     * Perform a full reflection cycle:
     * 1. Validate we have enough strategies
     * 2. Evaluate all strategies against all criteria
     * 3. Rank and recommend the best
     * 4. Optionally fuse the top N strategies
     * 5. Emit a reflection.completed event
     * 6. Store result in history
     */
    reflect(): Promise<ReflectionResult>;
    /**
     * Fuse the best aspects of the top N strategies into a hybrid strategy.
     * The fused strategy takes the best estimated values for cost, quality,
     * duration, and risk from the top candidates, and combines their approaches.
     */
    fuse(topN?: number): Strategy;
    /**
     * Get past reflection results for learning and trend analysis.
     */
    getHistory(): ReflectionResult[];
    /**
     * Clear reflection history.
     */
    clearHistory(): void;
    /**
     * Reset the engine — clear strategies, criteria, and history.
     */
    reset(): void;
    private buildReasoning;
}
//# sourceMappingURL=reflection-engine.d.ts.map