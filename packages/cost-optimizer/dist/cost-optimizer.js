/**
 * ALTER EGO OS — Cost Optimizer
 *
 * Selects the optimal LLM model for each task based on quality requirements,
 * cost constraints, and historical performance. Tracks actual usage and
 * reports savings from optimization.
 */
// ─── Cost Optimizer ───────────────────────────────────────────
export class CostOptimizer {
    models = new Map();
    usageRecords = [];
    eventBus;
    constructor(eventBus) {
        this.eventBus = eventBus;
    }
    // ─── Model Registration ─────────────────────────────────
    /**
     * Register an LLM model profile.
     * Throws if a model with the same ID already exists.
     */
    registerModel(profile) {
        if (this.models.has(profile.id)) {
            throw new Error(`Model already registered: ${profile.id}`);
        }
        this.models.set(profile.id, profile);
    }
    /**
     * Remove a registered model.
     */
    unregisterModel(modelId) {
        return this.models.delete(modelId);
    }
    /**
     * Get a model profile by ID.
     */
    getModel(modelId) {
        return this.models.get(modelId);
    }
    /**
     * List all registered model IDs.
     */
    listModels() {
        return Array.from(this.models.keys());
    }
    // ─── Model Selection ────────────────────────────────────
    /**
     * Select the best model for a given task, optionally respecting constraints.
     *
     * Selection algorithm:
     * 1. Filter models by required capabilities and preferred providers.
     * 2. Filter by minimum quality score constraint.
     * 3. Filter by max cost per request constraint.
     * 4. Rank remaining models by a composite score that balances
     *    quality, speed, and cost according to the task requirements.
     * 5. Return the top-ranked model with alternatives.
     */
    selectModel(task, constraint) {
        const candidates = this.getCandidates(task, constraint);
        if (candidates.length === 0) {
            throw new Error('No models satisfy the given constraints for this task');
        }
        // Score each candidate
        const scored = candidates.map((model) => {
            const estimatedCost = this.estimateCost(model.id, task.estimatedInputTokens, task.estimatedOutputTokens);
            // Composite score: weighted blend of quality, speed, and cost-efficiency
            // Quality weight increases with qualityRequirement
            // Speed weight increases with speedRequirement
            // Cost weight is the remainder
            const qualityWeight = task.qualityRequirement / 100;
            const speedWeight = (task.speedRequirement ?? 50) / 200; // Half the importance of quality
            const costWeight = Math.max(0.1, 1 - qualityWeight - speedWeight);
            // Normalize cost score: lower cost = higher score
            const maxCost = Math.max(...candidates.map((m) => this.estimateCost(m.id, task.estimatedInputTokens, task.estimatedOutputTokens)));
            const costScore = maxCost > 0 ? ((maxCost - estimatedCost) / maxCost) * 100 : 100;
            const compositeScore = model.qualityScore * qualityWeight +
                model.speedScore * speedWeight +
                costScore * costWeight;
            return { model, estimatedCost, compositeScore };
        });
        // Sort by composite score descending
        scored.sort((a, b) => b.compositeScore - a.compositeScore);
        const best = scored[0];
        const alternatives = scored.slice(1).map((s) => s.model.id);
        const selection = {
            modelId: best.model.id,
            estimatedCost: best.estimatedCost,
            estimatedQuality: best.model.qualityScore,
            reasoning: `Selected ${best.model.name} (quality: ${best.model.qualityScore}, speed: ${best.model.speedScore}, cost: $${best.estimatedCost.toFixed(6)}) with composite score ${best.compositeScore.toFixed(2)}`,
            alternatives,
        };
        // Emit event
        if (this.eventBus) {
            this.eventBus
                .emit({
                type: 'cost.modelSelected',
                payload: {
                    modelId: selection.modelId,
                    taskType: task.type,
                    estimatedCost: selection.estimatedCost,
                    estimatedQuality: selection.estimatedQuality,
                },
                source: 'cost-optimizer',
            })
                .catch(() => { });
        }
        return selection;
    }
    // ─── Cost Estimation ────────────────────────────────────
    /**
     * Estimate the cost of using a model for given token counts.
     */
    estimateCost(modelId, inputTokens, outputTokens) {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model not found: ${modelId}`);
        }
        const inputCost = (inputTokens / 1000) * model.costPer1kInputTokens;
        const outputCost = (outputTokens / 1000) * model.costPer1kOutputTokens;
        return inputCost + outputCost;
    }
    // ─── Usage Recording ────────────────────────────────────
    /**
     * Record actual usage of a model by an agent for a mission.
     */
    recordUsage(agentId, missionId, modelId, tokens, actualCost) {
        const record = {
            agentId,
            missionId,
            modelId,
            inputTokens: tokens.input,
            outputTokens: tokens.output,
            actualCost,
            timestamp: new Date().toISOString(),
        };
        this.usageRecords.push(record);
        // Emit event
        if (this.eventBus) {
            this.eventBus
                .emit({
                type: 'cost.usageRecorded',
                payload: {
                    agentId,
                    missionId,
                    modelId,
                    actualCost,
                },
                source: 'cost-optimizer',
            })
                .catch(() => { });
        }
    }
    // ─── Reporting ──────────────────────────────────────────
    /**
     * Generate a cost report for a given time period.
     * If no period is specified, includes all recorded usage.
     */
    getReport(period) {
        let records = this.usageRecords;
        if (period) {
            const fromTime = new Date(period.from).getTime();
            const toTime = new Date(period.to).getTime();
            records = records.filter((r) => {
                const t = new Date(r.timestamp).getTime();
                return t >= fromTime && t <= toTime;
            });
        }
        const costByModel = {};
        const costByAgent = {};
        const costByMission = {};
        let totalCostUsd = 0;
        for (const record of records) {
            totalCostUsd += record.actualCost;
            costByModel[record.modelId] = (costByModel[record.modelId] ?? 0) + record.actualCost;
            costByAgent[record.agentId] = (costByAgent[record.agentId] ?? 0) + record.actualCost;
            costByMission[record.missionId] =
                (costByMission[record.missionId] ?? 0) + record.actualCost;
        }
        const savings = this.calculateSavings(records);
        return {
            totalCostUsd,
            costByModel,
            costByAgent,
            costByMission,
            savingsFromOptimization: savings,
            period: period ?? { from: records[0]?.timestamp ?? new Date().toISOString(), to: new Date().toISOString() },
        };
    }
    /**
     * Calculate total savings from optimization vs always using the most expensive (best quality) model.
     */
    getSavings() {
        return this.calculateSavings(this.usageRecords);
    }
    // ─── Private Helpers ────────────────────────────────────
    getCandidates(task, constraint) {
        let candidates = Array.from(this.models.values());
        // Filter by required capabilities
        if (constraint?.requiredCapabilities && constraint.requiredCapabilities.length > 0) {
            candidates = candidates.filter((m) => constraint.requiredCapabilities.every((cap) => m.capabilities.includes(cap)));
        }
        // Filter by preferred providers
        if (constraint?.preferredProviders && constraint.preferredProviders.length > 0) {
            candidates = candidates.filter((m) => constraint.preferredProviders.includes(m.provider));
        }
        // Filter by minimum quality score
        if (constraint?.minQualityScore !== undefined) {
            candidates = candidates.filter((m) => m.qualityScore >= constraint.minQualityScore);
        }
        // Filter by max cost per request
        if (constraint?.maxCostPerRequest !== undefined) {
            candidates = candidates.filter((m) => {
                const cost = this.estimateCost(m.id, task.estimatedInputTokens, task.estimatedOutputTokens);
                return cost <= constraint.maxCostPerRequest;
            });
        }
        return candidates;
    }
    /**
     * Calculate savings by comparing actual costs against what they would have been
     * if the highest-quality (most expensive) model was always used.
     */
    calculateSavings(records) {
        if (records.length === 0)
            return 0;
        // Find the highest-quality model (tie-break by cost → most expensive)
        const allModels = Array.from(this.models.values());
        if (allModels.length === 0)
            return 0;
        const bestModel = allModels.reduce((best, m) => {
            if (m.qualityScore > best.qualityScore)
                return m;
            if (m.qualityScore === best.qualityScore && m.costPer1kInputTokens > best.costPer1kInputTokens)
                return m;
            return best;
        });
        let totalActual = 0;
        let totalIfBest = 0;
        for (const record of records) {
            totalActual += record.actualCost;
            // What would it have cost with the best model?
            const bestCost = (record.inputTokens / 1000) * bestModel.costPer1kInputTokens +
                (record.outputTokens / 1000) * bestModel.costPer1kOutputTokens;
            totalIfBest += bestCost;
        }
        return Math.max(0, totalIfBest - totalActual);
    }
}
//# sourceMappingURL=cost-optimizer.js.map