/**
 * ALTER EGO OS — Cost Optimizer
 *
 * Selects the optimal LLM model for each task based on quality requirements,
 * cost constraints, and historical performance. Tracks actual usage and
 * reports savings from optimization.
 */
import type { EventBus } from '@alterego/event-bus';
import type { ModelId, ModelProfile, ModelSelection, CostConstraint, TaskDescription, CostReport } from './types.js';
export declare class CostOptimizer {
    private readonly models;
    private readonly usageRecords;
    private readonly eventBus?;
    constructor(eventBus?: EventBus);
    /**
     * Register an LLM model profile.
     * Throws if a model with the same ID already exists.
     */
    registerModel(profile: ModelProfile): void;
    /**
     * Remove a registered model.
     */
    unregisterModel(modelId: ModelId): boolean;
    /**
     * Get a model profile by ID.
     */
    getModel(modelId: ModelId): ModelProfile | undefined;
    /**
     * List all registered model IDs.
     */
    listModels(): ModelId[];
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
    selectModel(task: TaskDescription, constraint?: CostConstraint): ModelSelection;
    /**
     * Estimate the cost of using a model for given token counts.
     */
    estimateCost(modelId: ModelId, inputTokens: number, outputTokens: number): number;
    /**
     * Record actual usage of a model by an agent for a mission.
     */
    recordUsage(agentId: string, missionId: string, modelId: ModelId, tokens: {
        input: number;
        output: number;
    }, actualCost: number): void;
    /**
     * Generate a cost report for a given time period.
     * If no period is specified, includes all recorded usage.
     */
    getReport(period?: {
        from: string;
        to: string;
    }): CostReport;
    /**
     * Calculate total savings from optimization vs always using the most expensive (best quality) model.
     */
    getSavings(): number;
    private getCandidates;
    /**
     * Calculate savings by comparing actual costs against what they would have been
     * if the highest-quality (most expensive) model was always used.
     */
    private calculateSavings;
}
//# sourceMappingURL=cost-optimizer.d.ts.map