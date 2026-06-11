/**
 * ALTER EGO OS — Reflection Engine Implementation
 *
 * The core engine that ensures the system NEVER accepts the first solution.
 * It compares multiple strategies against weighted criteria, ranks them,
 * and can fuse the best aspects of multiple approaches into a superior hybrid.
 *
 * All significant actions emit events through the EventBus.
 */
// ─── Default Configuration ───────────────────────────────────
const DEFAULT_CONFIG = {
    minStrategies: 2,
    fusionTopN: 2,
    fusionEnabled: true,
};
// ─── Reflection Engine ───────────────────────────────────────
export class ReflectionEngine {
    config;
    eventBus;
    strategies = new Map();
    criteria = new Map();
    history = [];
    constructor(eventBus, config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.eventBus = eventBus ?? null;
    }
    // ─── Strategy Management ─────────────────────────────────
    /**
     * Register a candidate strategy for evaluation.
     * If a strategy with the same ID already exists, it will be replaced.
     */
    addStrategy(strategy) {
        this.strategies.set(strategy.id, strategy);
    }
    /**
     * Remove a strategy by ID.
     */
    removeStrategy(id) {
        return this.strategies.delete(id);
    }
    /**
     * Get a registered strategy by ID.
     */
    getStrategy(id) {
        return this.strategies.get(id);
    }
    /**
     * Get all registered strategies.
     */
    getStrategies() {
        return [...this.strategies.values()];
    }
    /**
     * Clear all registered strategies.
     */
    clearStrategies() {
        this.strategies.clear();
    }
    // ─── Criteria Management ─────────────────────────────────
    /**
     * Register an evaluation criterion.
     * If a criterion with the same name already exists, it will be replaced.
     */
    addCriteria(criteria) {
        this.criteria.set(criteria.name, criteria);
    }
    /**
     * Remove a criterion by name.
     */
    removeCriteria(name) {
        return this.criteria.delete(name);
    }
    /**
     * Get all registered criteria.
     */
    getCriteria() {
        return [...this.criteria.values()];
    }
    /**
     * Clear all registered criteria.
     */
    clearCriteria() {
        this.criteria.clear();
    }
    // ─── Evaluation ──────────────────────────────────────────
    /**
     * Evaluate all registered strategies against all registered criteria.
     * Returns unsorted evaluation results — each result includes the raw scores
     * and the weighted composite score.
     */
    async evaluate() {
        const strategies = [...this.strategies.values()];
        const criteriaList = [...this.criteria.values()];
        if (strategies.length === 0) {
            return [];
        }
        if (criteriaList.length === 0) {
            // No criteria — give every strategy a score of 0
            return strategies.map((s) => ({
                strategyId: s.id,
                scores: {},
                weightedScore: 0,
                rank: 0,
            }));
        }
        // Evaluate each strategy against all criteria
        const results = [];
        for (const strategy of strategies) {
            const scores = {};
            let weightedSum = 0;
            for (const criterion of criteriaList) {
                const rawScore = await criterion.evaluate(strategy);
                // Clamp score to 0-100
                const clampedScore = Math.max(0, Math.min(100, rawScore));
                scores[criterion.name] = clampedScore;
                weightedSum += clampedScore * criterion.weight;
            }
            results.push({
                strategyId: strategy.id,
                scores,
                weightedScore: Math.round(weightedSum * 100) / 100,
                rank: 0,
            });
        }
        // Assign ranks (1 = best)
        const sorted = [...results].sort((a, b) => b.weightedScore - a.weightedScore);
        for (let i = 0; i < sorted.length; i++) {
            sorted[i].rank = i + 1;
            // Also assign rank in the original results array
            const original = results.find((r) => r.strategyId === sorted[i].strategyId);
            if (original) {
                original.rank = i + 1;
            }
        }
        return results;
    }
    // ─── Reflect ─────────────────────────────────────────────
    /**
     * Perform a full reflection cycle:
     * 1. Validate we have enough strategies
     * 2. Evaluate all strategies against all criteria
     * 3. Rank and recommend the best
     * 4. Optionally fuse the top N strategies
     * 5. Emit a reflection.completed event
     * 6. Store result in history
     */
    async reflect() {
        const strategies = [...this.strategies.values()];
        if (strategies.length < this.config.minStrategies) {
            throw new Error(`Reflection requires at least ${this.config.minStrategies} strategies, but only ${strategies.length} are registered. ` +
                `The system NEVER accepts the first solution — add more alternatives.`);
        }
        // Evaluate
        const evaluations = await this.evaluate();
        // Sort by weighted score descending
        const sorted = [...evaluations].sort((a, b) => b.weightedScore - a.weightedScore);
        const topResult = sorted[0];
        const recommendation = topResult.strategyId;
        // Fuse if enabled and enough strategies
        let fusion;
        if (this.config.fusionEnabled && strategies.length >= 2) {
            fusion = this.fuse(this.config.fusionTopN);
        }
        // Build reasoning
        const reasoning = this.buildReasoning(strategies, sorted, fusion);
        const result = {
            strategies,
            evaluations: sorted,
            recommendation,
            fusion,
            reasoning,
            timestamp: new Date().toISOString(),
        };
        // Store in history
        this.history.push(result);
        // Emit event
        if (this.eventBus) {
            await this.eventBus.emit({
                type: 'reflection.completed',
                payload: {
                    recommendation,
                    strategiesConsidered: strategies.length,
                    topScore: topResult.weightedScore,
                    fused: fusion !== undefined,
                },
                source: 'reflection-engine',
            });
        }
        return result;
    }
    // ─── Fusion ──────────────────────────────────────────────
    /**
     * Fuse the best aspects of the top N strategies into a hybrid strategy.
     * The fused strategy takes the best estimated values for cost, quality,
     * duration, and risk from the top candidates, and combines their approaches.
     */
    fuse(topN = 2) {
        const strategies = [...this.strategies.values()];
        if (strategies.length < 2) {
            throw new Error('Fusion requires at least 2 strategies');
        }
        // Get current evaluations to determine ranking, or do a quick eval
        // For fusion, we sort strategies by their estimated quality (descending),
        // falling back to existing strategies if no evaluation is available
        const ranked = [...strategies].sort((a, b) => {
            const qualityA = a.estimatedQuality ?? 50;
            const qualityB = b.estimatedQuality ?? 50;
            return qualityB - qualityA;
        });
        const topStrategies = ranked.slice(0, Math.min(topN, strategies.length));
        // Fuse: take the best cost, best quality, best duration, lowest risk
        const fusedEstimatedCost = Math.min(...topStrategies.map((s) => s.estimatedCost ?? Infinity));
        const fusedEstimatedQuality = Math.max(...topStrategies.map((s) => s.estimatedQuality ?? 0));
        const fusedEstimatedDuration = Math.min(...topStrategies.map((s) => s.estimatedDuration ?? Infinity));
        // Risk: take the lowest risk level among top strategies
        const riskOrder = { low: 0, medium: 1, high: 2 };
        const fusedRiskLevel = topStrategies.reduce((best, s) => {
            const currentRisk = s.riskLevel ?? 'medium';
            const bestRisk = best;
            return riskOrder[currentRisk] < riskOrder[bestRisk] ? currentRisk : bestRisk;
        }, 'high');
        // Combine approaches
        const combinedApproach = topStrategies
            .map((s, i) => `Approach ${i + 1} (${s.name}): ${s.approach}`)
            .join('\n');
        // Combine descriptions
        const combinedDescription = `Fused strategy combining the best aspects of: ${topStrategies.map((s) => s.name).join(', ')}`;
        // Merge metadata
        const mergedMetadata = {};
        for (const s of topStrategies) {
            if (s.metadata) {
                Object.assign(mergedMetadata, s.metadata);
            }
        }
        return {
            id: `fused_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: `Fused: ${topStrategies.map((s) => s.name).join(' + ')}`,
            description: combinedDescription,
            approach: combinedApproach,
            estimatedCost: fusedEstimatedCost === Infinity ? undefined : fusedEstimatedCost,
            estimatedQuality: fusedEstimatedQuality,
            estimatedDuration: fusedEstimatedDuration === Infinity ? undefined : fusedEstimatedDuration,
            riskLevel: fusedRiskLevel,
            metadata: Object.keys(mergedMetadata).length > 0 ? mergedMetadata : undefined,
        };
    }
    // ─── History ─────────────────────────────────────────────
    /**
     * Get past reflection results for learning and trend analysis.
     */
    getHistory() {
        return [...this.history];
    }
    /**
     * Clear reflection history.
     */
    clearHistory() {
        this.history.length = 0;
    }
    // ─── Reset ───────────────────────────────────────────────
    /**
     * Reset the engine — clear strategies, criteria, and history.
     */
    reset() {
        this.strategies.clear();
        this.criteria.clear();
        this.history.length = 0;
    }
    // ─── Private Methods ─────────────────────────────────────
    buildReasoning(strategies, sortedEvals, fusion) {
        const lines = [];
        lines.push(`Reflected on ${strategies.length} strategies.`);
        // Top 3 ranking summary
        const topN = sortedEvals.slice(0, Math.min(3, sortedEvals.length));
        for (const evalResult of topN) {
            const strategy = strategies.find((s) => s.id === evalResult.strategyId);
            lines.push(`  #${evalResult.rank}: ${strategy?.name ?? evalResult.strategyId} (score: ${evalResult.weightedScore})`);
        }
        const recommended = strategies.find((s) => s.id === sortedEvals[0].strategyId);
        lines.push(`Recommendation: ${recommended?.name ?? sortedEvals[0].strategyId}`);
        if (fusion) {
            lines.push(`Fusion created: ${fusion.name}`);
        }
        // Why we recommend this
        const topEval = sortedEvals[0];
        const scoreEntries = Object.entries(topEval.scores);
        if (scoreEntries.length > 0) {
            const bestCriteria = scoreEntries.sort((a, b) => b[1] - a[1])[0];
            lines.push(`Strongest criterion: ${bestCriteria[0]} (${bestCriteria[1]}/100)`);
        }
        return lines.join('\n');
    }
}
//# sourceMappingURL=reflection-engine.js.map