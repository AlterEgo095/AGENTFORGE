/**
 * ALTER EGO OS — CostTracker Implementation
 *
 * Token counting, cost tracking per agent/mission.
 * Emits events on the EventBus for budget exceeded, usage recorded, etc.
 */
// ─── Implementation ────────────────────────────────────────────
export class CostTrackerImpl {
    budgets = new Map();
    records = [];
    eventBus;
    recordCounter = 0;
    constructor(eventBus) {
        this.eventBus = eventBus;
    }
    recordUsage(agentId, missionId, model, tokens, costUsd) {
        const record = {
            id: `usage_${++this.recordCounter}_${Date.now()}`,
            agentId,
            missionId,
            model,
            tokens,
            costUsd,
            timestamp: new Date().toISOString(),
        };
        this.records.push(record);
        this.eventBus.emit({
            type: 'cost.usage-recorded',
            payload: record,
            source: 'kernel.cost-tracker',
        });
        // Check budget after recording
        if (this.isBudgetExceeded(missionId)) {
            const budget = this.budgets.get(missionId) ?? 0;
            const missionCost = this.getMissionCost(missionId);
            this.eventBus.emit({
                type: 'cost.budget-exceeded',
                payload: {
                    missionId,
                    currentSpendUsd: missionCost.totalCostUsd,
                    maxBudgetUsd: budget,
                },
                source: 'kernel.cost-tracker',
                priority: 'high',
            });
        }
    }
    getBudget(missionId) {
        const maxBudgetUsd = this.budgets.get(missionId) ?? 0;
        const missionCost = this.getMissionCost(missionId);
        const currentSpendUsd = missionCost.totalCostUsd;
        const remainingUsd = Math.max(0, maxBudgetUsd - currentSpendUsd);
        const percentUsed = maxBudgetUsd > 0 ? (currentSpendUsd / maxBudgetUsd) * 100 : 0;
        return {
            missionId,
            maxBudgetUsd,
            currentSpendUsd,
            remainingUsd,
            percentUsed,
            exceeded: maxBudgetUsd > 0 && currentSpendUsd > maxBudgetUsd,
        };
    }
    getMissionCost(missionId) {
        const missionRecords = this.records.filter((r) => r.missionId === missionId);
        return this.buildCostBreakdown(missionRecords);
    }
    getAgentCost(agentId, period) {
        let agentRecords = this.records.filter((r) => r.agentId === agentId);
        if (period) {
            const fromTime = new Date(period.from).getTime();
            const toTime = new Date(period.to).getTime();
            agentRecords = agentRecords.filter((r) => {
                const recordTime = new Date(r.timestamp).getTime();
                return recordTime >= fromTime && recordTime <= toTime;
            });
        }
        return this.buildCostBreakdown(agentRecords);
    }
    setBudget(missionId, maxBudgetUsd) {
        this.budgets.set(missionId, maxBudgetUsd);
        this.eventBus.emit({
            type: 'cost.budget-set',
            payload: { missionId, maxBudgetUsd },
            source: 'kernel.cost-tracker',
        });
    }
    isBudgetExceeded(missionId) {
        const maxBudgetUsd = this.budgets.get(missionId);
        if (maxBudgetUsd === undefined || maxBudgetUsd <= 0) {
            return false;
        }
        const missionCost = this.getMissionCost(missionId);
        return missionCost.totalCostUsd > maxBudgetUsd;
    }
    getUsageRecords(missionId, agentId) {
        let filtered = [...this.records];
        if (missionId) {
            filtered = filtered.filter((r) => r.missionId === missionId);
        }
        if (agentId) {
            filtered = filtered.filter((r) => r.agentId === agentId);
        }
        return filtered;
    }
    // ─── Private Helpers ─────────────────────────────────────
    buildCostBreakdown(records) {
        let totalCostUsd = 0;
        let totalTokens = 0;
        const byModel = {};
        const byAgent = {};
        const byMission = {};
        for (const record of records) {
            totalCostUsd += record.costUsd;
            totalTokens += record.tokens.totalTokens;
            // Aggregate by model
            if (!byModel[record.model]) {
                byModel[record.model] = {
                    model: record.model,
                    costUsd: 0,
                    totalTokens: 0,
                    callCount: 0,
                };
            }
            byModel[record.model].costUsd += record.costUsd;
            byModel[record.model].totalTokens += record.tokens.totalTokens;
            byModel[record.model].callCount += 1;
            // Aggregate by agent
            byAgent[record.agentId] = (byAgent[record.agentId] ?? 0) + record.costUsd;
            // Aggregate by mission
            byMission[record.missionId] = (byMission[record.missionId] ?? 0) + record.costUsd;
        }
        return {
            totalCostUsd,
            totalTokens,
            byModel,
            byAgent,
            byMission,
        };
    }
}
//# sourceMappingURL=cost-tracker.js.map