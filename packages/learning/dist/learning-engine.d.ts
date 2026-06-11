/**
 * ALTER EGO OS — Learning Engine Implementation
 *
 * Records outcomes from every mission to improve future ones.
 * Discovers patterns, predicts cost/quality/duration, and generates
 * actionable insights from accumulated data.
 *
 * All significant actions emit events through the EventBus.
 */
import type { EventBus } from '@alterego/event-bus';
import type { MissionOutcome, LearningPattern, Prediction, LearningInsight, LearningStats, LearningConfig } from './types.js';
export declare class LearningEngine {
    private readonly config;
    private readonly eventBus;
    private readonly outcomes;
    private readonly patterns;
    private readonly insights;
    private predictionRecords;
    constructor(eventBus?: EventBus, config?: LearningConfig);
    /**
     * Record a mission outcome.
     * Emits a learning.outcome.recorded event.
     * If autoDiscoverPatterns is enabled, discovers patterns after recording.
     */
    recordOutcome(outcome: MissionOutcome): Promise<void>;
    /**
     * Discover patterns from historical outcomes.
     * If a missionType is provided, only discover patterns for that type.
     * Otherwise, discover patterns across all mission types.
     */
    getPatterns(missionType?: string): Promise<LearningPattern[]>;
    /**
     * Internal method to discover patterns from accumulated outcomes.
     * Emits learning.pattern.discovered events for new patterns.
     */
    private discoverPatterns;
    private addPatternFromOutcomes;
    /**
     * Predict cost, quality, and duration for a given mission type
     * based on historical outcomes.
     */
    predict(missionType: string): Prediction;
    /**
     * Generate actionable insights from accumulated data.
     * Emits learning.insight.generated events for new insights.
     */
    getInsights(): Promise<LearningInsight[]>;
    private generateInsights;
    /**
     * Get learning metrics — total outcomes, pattern count, prediction accuracy.
     */
    getStats(): LearningStats;
    /**
     * Retrieve past outcomes, optionally filtered by mission type.
     */
    getOutcomeHistory(missionType?: string, limit?: number): MissionOutcome[];
    /**
     * Record a prediction vs actual comparison for accuracy tracking.
     */
    recordPredictionAccuracy(prediction: {
        missionType: string;
        predictedCost: number;
        predictedQuality: number;
        predictedDuration: number;
        actualCost: number;
        actualQuality: number;
        actualDuration: number;
    }): void;
    /**
     * Reset the engine — clear outcomes, patterns, insights, and prediction records.
     */
    reset(): void;
    private groupByMissionType;
    private groupBy;
}
//# sourceMappingURL=learning-engine.d.ts.map