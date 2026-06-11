/**
 * ALTER EGO OS — Cost Optimizer Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CostOptimizer } from '../cost-optimizer.js';
import type { ModelProfile, TaskDescription, CostConstraint } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────

function makeModel(overrides: Partial<ModelProfile> = {}): ModelProfile {
  return {
    id: overrides.id ?? 'gpt-4',
    name: overrides.name ?? 'GPT-4',
    provider: overrides.provider ?? 'openai',
    costPer1kInputTokens: overrides.costPer1kInputTokens ?? 0.03,
    costPer1kOutputTokens: overrides.costPer1kOutputTokens ?? 0.06,
    maxTokens: overrides.maxTokens ?? 128000,
    qualityScore: overrides.qualityScore ?? 92,
    speedScore: overrides.speedScore ?? 60,
    capabilities: overrides.capabilities ?? ['code', 'writing', 'analysis'],
  };
}

const CHEAP_MODEL: ModelProfile = makeModel({
  id: 'gpt-3.5',
  name: 'GPT-3.5 Turbo',
  costPer1kInputTokens: 0.0005,
  costPer1kOutputTokens: 0.0015,
  maxTokens: 16384,
  qualityScore: 70,
  speedScore: 95,
  capabilities: ['code', 'writing'],
});

const MID_MODEL: ModelProfile = makeModel({
  id: 'gpt-4',
  name: 'GPT-4',
  costPer1kInputTokens: 0.03,
  costPer1kOutputTokens: 0.06,
  maxTokens: 128000,
  qualityScore: 92,
  speedScore: 60,
  capabilities: ['code', 'writing', 'analysis', 'research'],
});

const EXPENSIVE_MODEL: ModelProfile = makeModel({
  id: 'claude-opus',
  name: 'Claude Opus',
  provider: 'anthropic',
  costPer1kInputTokens: 0.015,
  costPer1kOutputTokens: 0.075,
  maxTokens: 200000,
  qualityScore: 95,
  speedScore: 45,
  capabilities: ['code', 'writing', 'analysis', 'research'],
});

const FAST_MODEL: ModelProfile = makeModel({
  id: 'groq-mixtral',
  name: 'Groq Mixtral',
  provider: 'groq',
  costPer1kInputTokens: 0.00024,
  costPer1kOutputTokens: 0.00024,
  maxTokens: 32768,
  qualityScore: 65,
  speedScore: 99,
  capabilities: ['code', 'writing'],
});

// ─── Tests ────────────────────────────────────────────────────

describe('CostOptimizer', () => {
  let optimizer: CostOptimizer;

  beforeEach(() => {
    optimizer = new CostOptimizer();
  });

  // ─── Model Registration ─────────────────────────────────

  describe('registerModel', () => {
    it('should register a model profile', () => {
      optimizer.registerModel(MID_MODEL);
      expect(optimizer.getModel('gpt-4')).toEqual(MID_MODEL);
    });

    it('should throw when registering a duplicate model', () => {
      optimizer.registerModel(MID_MODEL);
      expect(() => optimizer.registerModel(MID_MODEL)).toThrow('already registered');
    });

    it('should list all registered model IDs', () => {
      optimizer.registerModel(CHEAP_MODEL);
      optimizer.registerModel(MID_MODEL);
      expect(optimizer.listModels()).toEqual(['gpt-3.5', 'gpt-4']);
    });
  });

  describe('unregisterModel', () => {
    it('should remove a model', () => {
      optimizer.registerModel(MID_MODEL);
      expect(optimizer.unregisterModel('gpt-4')).toBe(true);
      expect(optimizer.getModel('gpt-4')).toBeUndefined();
    });

    it('should return false for non-existent model', () => {
      expect(optimizer.unregisterModel('nonexistent')).toBe(false);
    });
  });

  // ─── Cost Estimation ────────────────────────────────────

  describe('estimateCost', () => {
    it('should estimate cost correctly', () => {
      optimizer.registerModel(MID_MODEL);
      // 1000 input tokens * 0.03 + 500 output tokens * 0.06 = 30 + 30 = 60... wait
      // costPer1kInputTokens is per 1000 tokens
      // (1000 / 1000) * 0.03 + (500 / 1000) * 0.06 = 0.03 + 0.03 = 0.06
      const cost = optimizer.estimateCost('gpt-4', 1000, 500);
      expect(cost).toBeCloseTo(0.06, 6);
    });

    it('should throw for unknown model', () => {
      expect(() => optimizer.estimateCost('unknown', 1000, 500)).toThrow('not found');
    });
  });

  // ─── Model Selection ────────────────────────────────────

  describe('selectModel', () => {
    beforeEach(() => {
      optimizer.registerModel(CHEAP_MODEL);
      optimizer.registerModel(MID_MODEL);
      optimizer.registerModel(EXPENSIVE_MODEL);
      optimizer.registerModel(FAST_MODEL);
    });

    it('should select a model for a code task', () => {
      const task: TaskDescription = {
        type: 'code',
        estimatedInputTokens: 2000,
        estimatedOutputTokens: 1000,
        qualityRequirement: 80,
      };

      const selection = optimizer.selectModel(task);
      expect(selection.modelId).toBeDefined();
      expect(selection.estimatedCost).toBeGreaterThan(0);
      expect(selection.estimatedQuality).toBeGreaterThanOrEqual(0);
      expect(selection.reasoning).toBeTruthy();
      expect(Array.isArray(selection.alternatives)).toBe(true);
    });

    it('should select cheap model for low-quality tasks', () => {
      const task: TaskDescription = {
        type: 'code',
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 500,
        qualityRequirement: 30, // Low quality needed
        speedRequirement: 90,
      };

      const selection = optimizer.selectModel(task);
      // Should prefer cheap/fast models for low quality requirement
      expect(['gpt-3.5', 'groq-mixtral']).toContain(selection.modelId);
    });

    it('should select best model for high-quality tasks', () => {
      const task: TaskDescription = {
        type: 'research',
        estimatedInputTokens: 5000,
        estimatedOutputTokens: 2000,
        qualityRequirement: 95,
      };

      const selection = optimizer.selectModel(task);
      // Should prefer high-quality models
      expect(['claude-opus', 'gpt-4']).toContain(selection.modelId);
    });

    it('should throw when no models satisfy constraints', () => {
      const task: TaskDescription = {
        type: 'code',
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 500,
        qualityRequirement: 50,
      };

      const constraint: CostConstraint = {
        minQualityScore: 99, // No model has this
      };

      expect(() => optimizer.selectModel(task, constraint)).toThrow('No models satisfy');
    });

    it('should respect preferred providers', () => {
      const task: TaskDescription = {
        type: 'code',
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 500,
        qualityRequirement: 70,
      };

      const constraint: CostConstraint = {
        preferredProviders: ['anthropic'],
      };

      const selection = optimizer.selectModel(task, constraint);
      expect(selection.modelId).toBe('claude-opus');
    });

    it('should respect required capabilities', () => {
      const task: TaskDescription = {
        type: 'research',
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 500,
        qualityRequirement: 70,
      };

      const constraint: CostConstraint = {
        requiredCapabilities: ['research'],
      };

      const selection = optimizer.selectModel(task, constraint);
      expect(['claude-opus', 'gpt-4']).toContain(selection.modelId);
    });

    it('should respect max cost per request', () => {
      const task: TaskDescription = {
        type: 'code',
        estimatedInputTokens: 5000,
        estimatedOutputTokens: 2000,
        qualityRequirement: 50,
      };

      const constraint: CostConstraint = {
        maxCostPerRequest: 0.01, // Very cheap
      };

      const selection = optimizer.selectModel(task, constraint);
      // Only cheap models should pass
      expect(['gpt-3.5', 'groq-mixtral']).toContain(selection.modelId);
    });

    it('should include alternatives in selection', () => {
      const task: TaskDescription = {
        type: 'code',
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 500,
        qualityRequirement: 60,
      };

      const selection = optimizer.selectModel(task);
      expect(selection.alternatives.length).toBeGreaterThan(0);
    });
  });

  // ─── Usage Recording ────────────────────────────────────

  describe('recordUsage', () => {
    it('should record usage', () => {
      optimizer.registerModel(MID_MODEL);
      optimizer.recordUsage('agent-1', 'mission-1', 'gpt-4', { input: 2000, output: 500 }, 0.09);

      const report = optimizer.getReport();
      expect(report.totalCostUsd).toBeCloseTo(0.09, 6);
      expect(report.costByAgent['agent-1']).toBeCloseTo(0.09, 6);
      expect(report.costByMission['mission-1']).toBeCloseTo(0.09, 6);
      expect(report.costByModel['gpt-4']).toBeCloseTo(0.09, 6);
    });

    it('should aggregate usage across multiple records', () => {
      optimizer.registerModel(MID_MODEL);
      optimizer.registerModel(CHEAP_MODEL);

      optimizer.recordUsage('agent-1', 'mission-1', 'gpt-4', { input: 2000, output: 500 }, 0.09);
      optimizer.recordUsage('agent-1', 'mission-2', 'gpt-4', { input: 1000, output: 300 }, 0.048);
      optimizer.recordUsage('agent-2', 'mission-1', 'gpt-3.5', { input: 500, output: 200 }, 0.00055);

      const report = optimizer.getReport();
      expect(report.totalCostUsd).toBeCloseTo(0.09 + 0.048 + 0.00055, 6);
      expect(report.costByAgent['agent-1']).toBeCloseTo(0.09 + 0.048, 6);
      expect(report.costByAgent['agent-2']).toBeCloseTo(0.00055, 6);
      expect(report.costByMission['mission-1']).toBeCloseTo(0.09 + 0.00055, 6);
    });
  });

  // ─── Reporting ──────────────────────────────────────────

  describe('getReport', () => {
    beforeEach(() => {
      optimizer.registerModel(MID_MODEL);
      optimizer.registerModel(CHEAP_MODEL);
    });

    it('should generate a cost report for all usage', () => {
      optimizer.recordUsage('agent-1', 'mission-1', 'gpt-4', { input: 1000, output: 500 }, 0.06);

      const report = optimizer.getReport();
      expect(report.totalCostUsd).toBeGreaterThan(0);
      expect(report.costByModel).toBeDefined();
      expect(report.costByAgent).toBeDefined();
      expect(report.costByMission).toBeDefined();
      expect(report.period).toBeDefined();
    });

    it('should generate a report filtered by time period', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
      const oneHourLater = new Date(now.getTime() + 3600000).toISOString();

      optimizer.recordUsage('agent-1', 'mission-1', 'gpt-4', { input: 1000, output: 500 }, 0.06);

      const report = optimizer.getReport({ from: oneHourAgo, to: oneHourLater });
      expect(report.totalCostUsd).toBeCloseTo(0.06, 6);
    });

    it('should return empty report for period with no usage', () => {
      const farPast = new Date('2020-01-01').toISOString();
      const farPastEnd = new Date('2020-01-02').toISOString();

      optimizer.recordUsage('agent-1', 'mission-1', 'gpt-4', { input: 1000, output: 500 }, 0.06);

      const report = optimizer.getReport({ from: farPast, to: farPastEnd });
      expect(report.totalCostUsd).toBe(0);
    });
  });

  // ─── Savings Calculation ────────────────────────────────

  describe('getSavings', () => {
    it('should calculate savings from using cheaper models', () => {
      optimizer.registerModel(EXPENSIVE_MODEL); // Best quality
      optimizer.registerModel(CHEAP_MODEL);

      // Record usage of the cheap model
      optimizer.recordUsage('agent-1', 'mission-1', 'gpt-3.5', { input: 1000, output: 500 }, 0.00125);

      const savings = optimizer.getSavings();
      // Savings = cost_if_best_model - actual_cost
      // cost_if_best_model for claude-opus: (1000/1000)*0.015 + (500/1000)*0.075 = 0.015 + 0.0375 = 0.0525
      // actual = 0.00125
      // savings = 0.0525 - 0.00125 = 0.05125
      expect(savings).toBeCloseTo(0.05125, 4);
    });

    it('should return 0 savings when no usage is recorded', () => {
      optimizer.registerModel(EXPENSIVE_MODEL);
      expect(optimizer.getSavings()).toBe(0);
    });

    it('should return 0 savings when always using the best model', () => {
      optimizer.registerModel(EXPENSIVE_MODEL);
      optimizer.recordUsage('agent-1', 'mission-1', 'claude-opus', { input: 1000, output: 500 }, 0.0525);

      const savings = optimizer.getSavings();
      expect(savings).toBeCloseTo(0, 4);
    });
  });

  // ─── EventBus Integration ───────────────────────────────

  describe('EventBus integration', () => {
    it('should emit event when model is selected', () => {
      const emitMock = vi.fn().mockResolvedValue(0);
      const mockBus = { emit: emitMock } as any;
      const optimizerWithBus = new CostOptimizer(mockBus);

      optimizerWithBus.registerModel(MID_MODEL);

      const task: TaskDescription = {
        type: 'code',
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 500,
        qualityRequirement: 80,
      };

      optimizerWithBus.selectModel(task);

      expect(emitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cost.modelSelected',
          source: 'cost-optimizer',
        })
      );
    });

    it('should emit event when usage is recorded', () => {
      const emitMock = vi.fn().mockResolvedValue(0);
      const mockBus = { emit: emitMock } as any;
      const optimizerWithBus = new CostOptimizer(mockBus);

      optimizerWithBus.registerModel(MID_MODEL);
      optimizerWithBus.recordUsage('agent-1', 'mission-1', 'gpt-4', { input: 1000, output: 500 }, 0.06);

      expect(emitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cost.usageRecorded',
          source: 'cost-optimizer',
        })
      );
    });

    it('should not throw if EventBus emit fails', () => {
      const failBus = {
        emit: vi.fn().mockRejectedValue(new Error('bus error')),
      } as any;
      const optimizerWithBus = new CostOptimizer(failBus);

      optimizerWithBus.registerModel(MID_MODEL);

      const task: TaskDescription = {
        type: 'code',
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 500,
        qualityRequirement: 80,
      };

      // Should NOT throw
      expect(() => optimizerWithBus.selectModel(task)).not.toThrow();
    });
  });

  // ─── End-to-End ─────────────────────────────────────────

  describe('end-to-end cost optimization workflow', () => {
    it('should select, use, and report on models across a mission', () => {
      optimizer.registerModel(CHEAP_MODEL);
      optimizer.registerModel(MID_MODEL);
      optimizer.registerModel(EXPENSIVE_MODEL);

      // Task 1: Simple code review — low quality needed
      const simpleTask: TaskDescription = {
        type: 'code',
        estimatedInputTokens: 500,
        estimatedOutputTokens: 200,
        qualityRequirement: 40,
        speedRequirement: 80,
      };

      const sel1 = optimizer.selectModel(simpleTask);
      optimizer.recordUsage('reviewer', 'mission-x', sel1.modelId, { input: 500, output: 200 }, 0.001);

      // Task 2: Complex analysis — high quality needed
      const complexTask: TaskDescription = {
        type: 'analysis',
        estimatedInputTokens: 5000,
        estimatedOutputTokens: 3000,
        qualityRequirement: 95,
      };

      const sel2 = optimizer.selectModel(complexTask);
      optimizer.recordUsage('analyst', 'mission-x', sel2.modelId, { input: 5000, output: 3000 }, 0.25);

      // Task 3: Research with provider constraint
      const researchTask: TaskDescription = {
        type: 'research',
        estimatedInputTokens: 3000,
        estimatedOutputTokens: 1500,
        qualityRequirement: 85,
      };

      const sel3 = optimizer.selectModel(researchTask, {
        preferredProviders: ['openai', 'anthropic'],
        requiredCapabilities: ['research'],
      });
      optimizer.recordUsage('researcher', 'mission-x', sel3.modelId, { input: 3000, output: 1500 }, 0.15);

      // Generate report
      const report = optimizer.getReport();
      expect(report.totalCostUsd).toBeCloseTo(0.001 + 0.25 + 0.15, 4);
      expect(Object.keys(report.costByAgent)).toHaveLength(3);
      expect(report.savingsFromOptimization).toBeGreaterThanOrEqual(0);
    });
  });
});
