/**
 * ALTER EGO OS — CostTracker Implementation
 *
 * Token counting, cost tracking per agent/mission.
 * Emits events on the EventBus for budget exceeded, usage recorded, etc.
 */
import { EventBus } from '@alterego/event-bus';
import type { CostTracker, TokenUsage, BudgetStatus, CostBreakdown, UsageRecord, TimePeriod } from './types.js';
export declare class CostTrackerImpl implements CostTracker {
    private readonly budgets;
    private readonly records;
    private readonly eventBus;
    private recordCounter;
    constructor(eventBus: EventBus);
    recordUsage(agentId: string, missionId: string, model: string, tokens: TokenUsage, costUsd: number): void;
    getBudget(missionId: string): BudgetStatus;
    getMissionCost(missionId: string): CostBreakdown;
    getAgentCost(agentId: string, period?: TimePeriod): CostBreakdown;
    setBudget(missionId: string, maxBudgetUsd: number): void;
    isBudgetExceeded(missionId: string): boolean;
    getUsageRecords(missionId?: string, agentId?: string): UsageRecord[];
    private buildCostBreakdown;
}
//# sourceMappingURL=cost-tracker.d.ts.map