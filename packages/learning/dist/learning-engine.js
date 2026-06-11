/**
 * ALTER EGO OS — Learning Engine Implementation
 *
 * Records outcomes from every mission to improve future ones.
 * Discovers patterns, predicts cost/quality/duration, and generates
 * actionable insights from accumulated data.
 *
 * All significant actions emit events through the EventBus.
 */
// ─── Default Configuration ───────────────────────────────────
const DEFAULT_CONFIG = {
    minOutcomesForPrediction: 3,
    maxOutcomes: 10000,
    autoDiscoverPatterns: true,
};
// ─── Learning Engine ─────────────────────────────────────────
export class LearningEngine {
    config;
    eventBus;
    outcomes = [];
    patterns = [];
    insights = [];
    predictionRecords = [];
    constructor(eventBus, config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.eventBus = eventBus ?? null;
    }
    // ─── Outcome Recording ───────────────────────────────────
    /**
     * Record a mission outcome.
     * Emits a learning.outcome.recorded event.
     * If autoDiscoverPatterns is enabled, discovers patterns after recording.
     */
    async recordOutcome(outcome) {
        // Enforce max outcomes
        if (this.outcomes.length >= this.config.maxOutcomes) {
            this.outcomes.shift();
        }
        this.outcomes.push(outcome);
        // Emit event
        if (this.eventBus) {
            await this.eventBus.emit({
                type: 'learning.outcome.recorded',
                payload: {
                    outcomeId: outcome.id,
                    missionType: outcome.missionType,
                    status: outcome.status,
                },
                source: 'learning-engine',
            });
        }
        // Auto-discover patterns if enabled and we have enough data
        if (this.config.autoDiscoverPatterns && this.outcomes.length >= 3) {
            await this.discoverPatterns();
        }
    }
    // ─── Pattern Discovery ───────────────────────────────────
    /**
     * Discover patterns from historical outcomes.
     * If a missionType is provided, only discover patterns for that type.
     * Otherwise, discover patterns across all mission types.
     */
    async getPatterns(missionType) {
        if (missionType) {
            return this.patterns.filter((p) => p.missionType === missionType);
        }
        return [...this.patterns];
    }
    /**
     * Internal method to discover patterns from accumulated outcomes.
     * Emits learning.pattern.discovered events for new patterns.
     */
    async discoverPatterns() {
        const previousPatternCount = this.patterns.length;
        // Clear existing patterns and recalculate
        this.patterns.length = 0;
        // Group outcomes by mission type
        const byType = this.groupByMissionType();
        for (const [missionType, outcomes] of byType.entries()) {
            // Pattern 1: Overall performance for this mission type
            this.addPatternFromOutcomes(missionType, `Overall performance for ${missionType}`, outcomes);
            // Pattern 2: Model-based patterns
            const byModel = this.groupBy(outcomes, (o) => o.modelUsed);
            for (const [model, modelOutcomes] of byModel.entries()) {
                if (modelOutcomes.length >= 2) {
                    this.addPatternFromOutcomes(missionType, `Performance with model ${model}`, modelOutcomes);
                }
            }
            // Pattern 3: High-correction patterns (indicating difficulty)
            const highCorrection = outcomes.filter((o) => o.corrections > 2);
            if (highCorrection.length >= 2) {
                this.addPatternFromOutcomes(missionType, `High-correction outcomes (>2 corrections)`, highCorrection);
            }
            // Pattern 4: Low-correction patterns (smooth execution)
            const lowCorrection = outcomes.filter((o) => o.corrections <= 1 && o.status === 'success');
            if (lowCorrection.length >= 2) {
                this.addPatternFromOutcomes(missionType, `Smooth execution (≤1 correction, success)`, lowCorrection);
            }
            // Pattern 5: Error type patterns
            const errorTypeCounts = new Map();
            for (const o of outcomes) {
                for (const errType of o.errorTypes) {
                    if (!errorTypeCounts.has(errType)) {
                        errorTypeCounts.set(errType, []);
                    }
                    errorTypeCounts.get(errType).push(o);
                }
            }
            for (const [errType, errOutcomes] of errorTypeCounts.entries()) {
                if (errOutcomes.length >= 2) {
                    this.addPatternFromOutcomes(missionType, `Outcomes with error type: ${errType}`, errOutcomes);
                }
            }
        }
        // Emit events for newly discovered patterns
        if (this.eventBus) {
            for (let i = previousPatternCount; i < this.patterns.length; i++) {
                const p = this.patterns[i];
                await this.eventBus.emit({
                    type: 'learning.pattern.discovered',
                    payload: {
                        pattern: p.pattern,
                        missionType: p.missionType,
                        frequency: p.frequency,
                    },
                    source: 'learning-engine',
                });
            }
        }
        // Generate insights from patterns
        await this.generateInsights();
    }
    addPatternFromOutcomes(missionType, patternDescription, outcomes) {
        if (outcomes.length === 0)
            return;
        const totalQuality = outcomes.reduce((sum, o) => sum + o.qualityScore, 0);
        const totalCost = outcomes.reduce((sum, o) => sum + o.costUsd, 0);
        const totalDuration = outcomes.reduce((sum, o) => sum + o.durationMs, 0);
        const successCount = outcomes.filter((o) => o.status === 'success').length;
        this.patterns.push({
            pattern: patternDescription,
            missionType,
            frequency: outcomes.length,
            avgQuality: Math.round((totalQuality / outcomes.length) * 100) / 100,
            avgCost: Math.round((totalCost / outcomes.length) * 100) / 100,
            avgDuration: Math.round(totalDuration / outcomes.length),
            successRate: Math.round((successCount / outcomes.length) * 100) / 100,
        });
    }
    // ─── Prediction ──────────────────────────────────────────
    /**
     * Predict cost, quality, and duration for a given mission type
     * based on historical outcomes.
     */
    predict(missionType) {
        const typeOutcomes = this.outcomes.filter((o) => o.missionType === missionType);
        if (typeOutcomes.length < this.config.minOutcomesForPrediction) {
            return {
                missionType,
                estimatedCost: 0,
                estimatedDuration: 0,
                estimatedQuality: 0,
                confidence: 0,
                basedOnOutcomes: typeOutcomes.length,
            };
        }
        // Use exponentially weighted moving average — recent outcomes matter more
        // Sort oldest-first so that newer data is applied last (and thus weighted more)
        const sorted = [...typeOutcomes].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const alpha = 0.3; // Smoothing factor
        let estCost = sorted[0].costUsd;
        let estQuality = sorted[0].qualityScore;
        let estDuration = sorted[0].durationMs;
        for (let i = 1; i < sorted.length; i++) {
            estCost = alpha * sorted[i].costUsd + (1 - alpha) * estCost;
            estQuality = alpha * sorted[i].qualityScore + (1 - alpha) * estQuality;
            estDuration = alpha * sorted[i].durationMs + (1 - alpha) * estDuration;
        }
        // Confidence increases with more data, but caps at 0.95
        const confidence = Math.min(0.95, typeOutcomes.length / 20);
        return {
            missionType,
            estimatedCost: Math.round(estCost * 100) / 100,
            estimatedDuration: Math.round(estDuration),
            estimatedQuality: Math.round(estQuality * 100) / 100,
            confidence: Math.round(confidence * 100) / 100,
            basedOnOutcomes: typeOutcomes.length,
        };
    }
    // ─── Insights ────────────────────────────────────────────
    /**
     * Generate actionable insights from accumulated data.
     * Emits learning.insight.generated events for new insights.
     */
    async getInsights() {
        return [...this.insights];
    }
    async generateInsights() {
        const previousInsightCount = this.insights.length;
        this.insights.length = 0;
        // Only generate insights if we have enough data
        if (this.outcomes.length < 3)
            return;
        const byType = this.groupByMissionType();
        for (const [missionType, outcomes] of byType.entries()) {
            const successRate = outcomes.filter((o) => o.status === 'success').length / outcomes.length;
            // Warning: Low success rate
            if (successRate < 0.5 && outcomes.length >= 3) {
                this.insights.push({
                    type: 'warning',
                    description: `${missionType} missions have a low success rate of ${Math.round(successRate * 100)}%`,
                    evidence: `Based on ${outcomes.length} outcomes`,
                    impact: successRate < 0.3 ? 'high' : 'medium',
                });
            }
            // Best practice: High success rate
            if (successRate >= 0.8 && outcomes.length >= 3) {
                this.insights.push({
                    type: 'best_practice',
                    description: `${missionType} missions consistently succeed (${Math.round(successRate * 100)}% success rate)`,
                    evidence: `Based on ${outcomes.length} outcomes`,
                    impact: 'medium',
                });
            }
            // Optimization: Find the best model for this mission type
            const byModel = this.groupBy(outcomes, (o) => o.modelUsed);
            let bestModel = '';
            let bestModelQuality = 0;
            let cheapestModel = '';
            let cheapestModelCost = Infinity;
            for (const [model, modelOutcomes] of byModel.entries()) {
                const avgQ = modelOutcomes.reduce((s, o) => s + o.qualityScore, 0) / modelOutcomes.length;
                const avgC = modelOutcomes.reduce((s, o) => s + o.costUsd, 0) / modelOutcomes.length;
                if (avgQ > bestModelQuality && modelOutcomes.length >= 2) {
                    bestModelQuality = avgQ;
                    bestModel = model;
                }
                if (avgC < cheapestModelCost && modelOutcomes.length >= 2) {
                    cheapestModelCost = avgC;
                    cheapestModel = model;
                }
            }
            if (bestModel) {
                this.insights.push({
                    type: 'optimization',
                    description: `For ${missionType}, model ${bestModel} produces the highest quality (avg ${Math.round(bestModelQuality)})`,
                    evidence: `Based on ${byModel.get(bestModel).length} outcomes`,
                    impact: bestModelQuality > 80 ? 'high' : 'medium',
                });
            }
            if (cheapestModel && cheapestModel !== bestModel) {
                this.insights.push({
                    type: 'optimization',
                    description: `For ${missionType}, model ${cheapestModel} is the most cost-effective (avg $${Math.round(cheapestModelCost * 100) / 100})`,
                    evidence: `Based on ${byModel.get(cheapestModel).length} outcomes`,
                    impact: 'low',
                });
            }
            // Warning: High correction rate
            const avgCorrections = outcomes.reduce((s, o) => s + o.corrections, 0) / outcomes.length;
            if (avgCorrections > 3) {
                this.insights.push({
                    type: 'warning',
                    description: `${missionType} missions require an average of ${Math.round(avgCorrections * 10) / 10} corrections — consider improving initial instructions`,
                    evidence: `Based on ${outcomes.length} outcomes`,
                    impact: avgCorrections > 5 ? 'high' : 'medium',
                });
            }
            // Warning: Recurring error types
            const errorCounts = new Map();
            for (const o of outcomes) {
                for (const errType of o.errorTypes) {
                    errorCounts.set(errType, (errorCounts.get(errType) ?? 0) + 1);
                }
            }
            for (const [errType, count] of errorCounts.entries()) {
                if (count >= 3) {
                    this.insights.push({
                        type: 'warning',
                        description: `Recurring error "${errType}" appears in ${count} ${missionType} missions`,
                        evidence: `Out of ${outcomes.length} total outcomes`,
                        impact: count >= 5 ? 'high' : 'medium',
                    });
                }
            }
            // Best practice: Low correction, high quality outcomes
            const smoothOutcomes = outcomes.filter((o) => o.corrections <= 1 && o.qualityScore >= 80 && o.status === 'success');
            if (smoothOutcomes.length >= 3) {
                const avgCost = smoothOutcomes.reduce((s, o) => s + o.costUsd, 0) / smoothOutcomes.length;
                this.insights.push({
                    type: 'best_practice',
                    description: `${missionType} missions with ≤1 correction achieve quality ≥80 at avg cost $${Math.round(avgCost * 100) / 100}`,
                    evidence: `Based on ${smoothOutcomes.length} outcomes`,
                    impact: 'medium',
                });
            }
        }
        // Emit events for new insights
        if (this.eventBus) {
            for (let i = previousInsightCount; i < this.insights.length; i++) {
                const insight = this.insights[i];
                await this.eventBus.emit({
                    type: 'learning.insight.generated',
                    payload: {
                        type: insight.type,
                        description: insight.description,
                        impact: insight.impact,
                    },
                    source: 'learning-engine',
                });
            }
        }
    }
    // ─── Stats ───────────────────────────────────────────────
    /**
     * Get learning metrics — total outcomes, pattern count, prediction accuracy.
     */
    getStats() {
        const totalOutcomes = this.outcomes.length;
        const missionTypeSet = new Set(this.outcomes.map((o) => o.missionType));
        const successCount = this.outcomes.filter((o) => o.status === 'success').length;
        const overallSuccessRate = totalOutcomes > 0 ? successCount / totalOutcomes : 0;
        const avgQuality = totalOutcomes > 0
            ? this.outcomes.reduce((s, o) => s + o.qualityScore, 0) / totalOutcomes
            : 0;
        const avgCost = totalOutcomes > 0
            ? this.outcomes.reduce((s, o) => s + o.costUsd, 0) / totalOutcomes
            : 0;
        const avgDuration = totalOutcomes > 0
            ? this.outcomes.reduce((s, o) => s + o.durationMs, 0) / totalOutcomes
            : 0;
        // Prediction accuracy
        const totalPredictions = this.predictionRecords.length;
        let avgCostError = 0;
        let avgQualityError = 0;
        let avgDurationError = 0;
        if (totalPredictions > 0) {
            avgCostError =
                this.predictionRecords.reduce((s, r) => s + Math.abs(r.predictedCost - r.actualCost), 0) /
                    totalPredictions;
            avgQualityError =
                this.predictionRecords.reduce((s, r) => s + Math.abs(r.predictedQuality - r.actualQuality), 0) / totalPredictions;
            avgDurationError =
                this.predictionRecords.reduce((s, r) => s + Math.abs(r.predictedDuration - r.actualDuration), 0) / totalPredictions;
        }
        return {
            totalOutcomes,
            missionTypes: missionTypeSet.size,
            patternCount: this.patterns.length,
            insightCount: this.insights.length,
            overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
            avgQuality: Math.round(avgQuality * 100) / 100,
            avgCost: Math.round(avgCost * 100) / 100,
            avgDuration: Math.round(avgDuration),
            predictionAccuracy: {
                totalPredictions,
                avgCostError: Math.round(avgCostError * 100) / 100,
                avgQualityError: Math.round(avgQualityError * 100) / 100,
                avgDurationError: Math.round(avgDurationError),
            },
        };
    }
    // ─── Outcome History ─────────────────────────────────────
    /**
     * Retrieve past outcomes, optionally filtered by mission type.
     */
    getOutcomeHistory(missionType, limit) {
        let results = missionType
            ? this.outcomes.filter((o) => o.missionType === missionType)
            : [...this.outcomes];
        // Sort by timestamp descending (most recent first)
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (limit && limit > 0) {
            results = results.slice(0, limit);
        }
        return results;
    }
    // ─── Prediction Tracking ─────────────────────────────────
    /**
     * Record a prediction vs actual comparison for accuracy tracking.
     */
    recordPredictionAccuracy(prediction) {
        this.predictionRecords.push(prediction);
    }
    // ─── Reset ───────────────────────────────────────────────
    /**
     * Reset the engine — clear outcomes, patterns, insights, and prediction records.
     */
    reset() {
        this.outcomes.length = 0;
        this.patterns.length = 0;
        this.insights.length = 0;
        this.predictionRecords = [];
    }
    // ─── Private Helpers ─────────────────────────────────────
    groupByMissionType() {
        return this.groupBy(this.outcomes, (o) => o.missionType);
    }
    groupBy(items, keyFn) {
        const map = new Map();
        for (const item of items) {
            const key = keyFn(item);
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(item);
        }
        return map;
    }
}
//# sourceMappingURL=learning-engine.js.map