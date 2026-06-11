/**
 * ALTER EGO OS — CostTracker Implementation
 *
 * Token counting, cost tracking per agent/mission.
 * Emits events on the EventBus for budget exceeded, usage recorded, etc.
 */

import { EventBus } from '@alterego/event-bus';
import type {
  CostTracker,
  TokenUsage,
  BudgetStatus,
  CostBreakdown,
  ModelCost,
  UsageRecord,
  TimePeriod,
} from './types.js';

// ─── Implementation ────────────────────────────────────────────

export class CostTrackerImpl implements CostTracker {
  private readonly budgets: Map<string, number> = new Map();
  private readonly records: UsageRecord[] = [];
  private readonly eventBus: EventBus;
  private recordCounter = 0;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  recordUsage(agentId: string, missionId: string, model: string, tokens: TokenUsage, costUsd: number): void {
    const record: UsageRecord = {
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

  getBudget(missionId: string): BudgetStatus {
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

  getMissionCost(missionId: string): CostBreakdown {
    const missionRecords = this.records.filter((r) => r.missionId === missionId);

    return this.buildCostBreakdown(missionRecords);
  }

  getAgentCost(agentId: string, period?: TimePeriod): CostBreakdown {
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

  setBudget(missionId: string, maxBudgetUsd: number): void {
    this.budgets.set(missionId, maxBudgetUsd);

    this.eventBus.emit({
      type: 'cost.budget-set',
      payload: { missionId, maxBudgetUsd },
      source: 'kernel.cost-tracker',
    });
  }

  isBudgetExceeded(missionId: string): boolean {
    const maxBudgetUsd = this.budgets.get(missionId);
    if (maxBudgetUsd === undefined || maxBudgetUsd <= 0) {
      return false;
    }

    const missionCost = this.getMissionCost(missionId);
    return missionCost.totalCostUsd > maxBudgetUsd;
  }

  getUsageRecords(missionId?: string, agentId?: string): UsageRecord[] {
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

  private buildCostBreakdown(records: UsageRecord[]): CostBreakdown {
    let totalCostUsd = 0;
    let totalTokens = 0;
    const byModel: Record<string, ModelCost> = {};
    const byAgent: Record<string, number> = {};
    const byMission: Record<string, number> = {};

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
      byModel[record.model]!.costUsd += record.costUsd;
      byModel[record.model]!.totalTokens += record.tokens.totalTokens;
      byModel[record.model]!.callCount += 1;

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
