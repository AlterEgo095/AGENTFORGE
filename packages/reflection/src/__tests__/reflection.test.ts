/**
 * ALTER EGO OS — Reflection Engine Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReflectionEngine } from '../index.js';
import type {
  Strategy,
  EvaluationCriteria,
  ReflectionResult,
} from '../index.js';
import { EventBus } from '../../../event-bus/src/index.js';

// ─── Helpers ──────────────────────────────────────────────────

function makeStrategy(overrides: Partial<Strategy> & { id: string }): Strategy {
  return {
    name: `Strategy ${overrides.id}`,
    description: `Description for ${overrides.id}`,
    approach: `Approach for ${overrides.id}`,
    estimatedCost: 10,
    estimatedQuality: 70,
    estimatedDuration: 1000,
    riskLevel: 'medium',
    ...overrides,
  };
}

function costCriteria(): EvaluationCriteria {
  return {
    name: 'cost',
    weight: 0.3,
    evaluate: (s: Strategy) => {
      // Lower cost = higher score
      const cost = s.estimatedCost ?? 50;
      return Math.max(0, 100 - cost);
    },
  };
}

function qualityCriteria(): EvaluationCriteria {
  return {
    name: 'quality',
    weight: 0.5,
    evaluate: (s: Strategy) => s.estimatedQuality ?? 50,
  };
}

function speedCriteria(): EvaluationCriteria {
  return {
    name: 'speed',
    weight: 0.2,
    evaluate: (s: Strategy) => {
      // Faster = higher score
      const duration = s.estimatedDuration ?? 5000;
      return Math.max(0, 100 - duration / 100);
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────

describe('ReflectionEngine', () => {
  let engine: ReflectionEngine;

  beforeEach(() => {
    engine = new ReflectionEngine();
  });

  // ─── Strategy Management ─────────────────────────────────

  describe('addStrategy / getStrategy / getStrategies', () => {
    it('should register and retrieve a strategy', () => {
      const strategy = makeStrategy({ id: 's1' });
      engine.addStrategy(strategy);
      expect(engine.getStrategy('s1')).toEqual(strategy);
    });

    it('should return all registered strategies', () => {
      engine.addStrategy(makeStrategy({ id: 's1' }));
      engine.addStrategy(makeStrategy({ id: 's2' }));
      expect(engine.getStrategies()).toHaveLength(2);
    });

    it('should replace a strategy with the same ID', () => {
      engine.addStrategy(makeStrategy({ id: 's1', name: 'Original' }));
      engine.addStrategy(makeStrategy({ id: 's1', name: 'Updated' }));
      expect(engine.getStrategies()).toHaveLength(1);
      expect(engine.getStrategy('s1')!.name).toBe('Updated');
    });
  });

  describe('removeStrategy', () => {
    it('should remove a strategy by ID', () => {
      engine.addStrategy(makeStrategy({ id: 's1' }));
      expect(engine.removeStrategy('s1')).toBe(true);
      expect(engine.getStrategy('s1')).toBeUndefined();
    });

    it('should return false for non-existent strategy', () => {
      expect(engine.removeStrategy('nonexistent')).toBe(false);
    });
  });

  describe('clearStrategies', () => {
    it('should clear all strategies', () => {
      engine.addStrategy(makeStrategy({ id: 's1' }));
      engine.addStrategy(makeStrategy({ id: 's2' }));
      engine.clearStrategies();
      expect(engine.getStrategies()).toHaveLength(0);
    });
  });

  // ─── Criteria Management ─────────────────────────────────

  describe('addCriteria / getCriteria', () => {
    it('should register and retrieve criteria', () => {
      engine.addCriteria(qualityCriteria());
      const criteria = engine.getCriteria();
      expect(criteria).toHaveLength(1);
      expect(criteria[0]!.name).toBe('quality');
    });

    it('should replace a criterion with the same name', () => {
      engine.addCriteria({ name: 'quality', weight: 0.5, evaluate: () => 50 });
      engine.addCriteria({ name: 'quality', weight: 0.7, evaluate: () => 80 });
      expect(engine.getCriteria()).toHaveLength(1);
      expect(engine.getCriteria()[0]!.weight).toBe(0.7);
    });
  });

  describe('removeCriteria / clearCriteria', () => {
    it('should remove a criterion by name', () => {
      engine.addCriteria(qualityCriteria());
      expect(engine.removeCriteria('quality')).toBe(true);
      expect(engine.getCriteria()).toHaveLength(0);
    });

    it('should clear all criteria', () => {
      engine.addCriteria(costCriteria());
      engine.addCriteria(qualityCriteria());
      engine.clearCriteria();
      expect(engine.getCriteria()).toHaveLength(0);
    });
  });

  // ─── Evaluation ──────────────────────────────────────────

  describe('evaluate', () => {
    it('should score strategies against all criteria', async () => {
      engine.addStrategy(makeStrategy({ id: 'cheap', estimatedCost: 5, estimatedQuality: 60 }));
      engine.addStrategy(makeStrategy({ id: 'premium', estimatedCost: 50, estimatedQuality: 95 }));

      engine.addCriteria(costCriteria());
      engine.addCriteria(qualityCriteria());

      const results = await engine.evaluate();

      expect(results).toHaveLength(2);

      const cheapResult = results.find((r) => r.strategyId === 'cheap')!;
      const premiumResult = results.find((r) => r.strategyId === 'premium')!;

      // Cheap should score higher on cost, premium on quality
      expect(cheapResult.scores.cost).toBeGreaterThan(premiumResult.scores.cost);
      expect(premiumResult.scores.quality).toBeGreaterThan(cheapResult.scores.quality);
    });

    it('should compute weighted scores correctly', async () => {
      engine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 80 }));
      engine.addCriteria({ name: 'quality', weight: 1.0, evaluate: (s) => s.estimatedQuality ?? 0 });

      const results = await engine.evaluate();
      expect(results[0]!.weightedScore).toBe(80);
    });

    it('should assign ranks based on weighted score', async () => {
      engine.addStrategy(makeStrategy({ id: 'low', estimatedQuality: 30 }));
      engine.addStrategy(makeStrategy({ id: 'mid', estimatedQuality: 60 }));
      engine.addStrategy(makeStrategy({ id: 'high', estimatedQuality: 90 }));

      engine.addCriteria({ name: 'quality', weight: 1.0, evaluate: (s) => s.estimatedQuality ?? 0 });

      const results = await engine.evaluate();
      const sorted = [...results].sort((a, b) => a.rank - b.rank);

      expect(sorted[0]!.strategyId).toBe('high');
      expect(sorted[0]!.rank).toBe(1);
      expect(sorted[1]!.strategyId).toBe('mid');
      expect(sorted[1]!.rank).toBe(2);
      expect(sorted[2]!.strategyId).toBe('low');
      expect(sorted[2]!.rank).toBe(3);
    });

    it('should return empty results when no strategies are registered', async () => {
      const results = await engine.evaluate();
      expect(results).toHaveLength(0);
    });

    it('should return zero scores when no criteria are registered', async () => {
      engine.addStrategy(makeStrategy({ id: 's1' }));
      const results = await engine.evaluate();
      expect(results[0]!.weightedScore).toBe(0);
    });

    it('should support async evaluation functions', async () => {
      engine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 85 }));
      engine.addCriteria({
        name: 'async-quality',
        weight: 1.0,
        evaluate: async (s) => {
          await new Promise((r) => setTimeout(r, 10));
          return s.estimatedQuality ?? 0;
        },
      });

      const results = await engine.evaluate();
      expect(results[0]!.scores['async-quality']).toBe(85);
    });

    it('should clamp scores to 0-100 range', async () => {
      engine.addStrategy(makeStrategy({ id: 's1' }));
      engine.addCriteria({
        name: 'overflow',
        weight: 1.0,
        evaluate: () => 150,
      });
      engine.addCriteria({
        name: 'underflow',
        weight: 0,
        evaluate: () => -50,
      });

      const results = await engine.evaluate();
      expect(results[0]!.scores.overflow).toBe(100);
      expect(results[0]!.scores.underflow).toBe(0);
    });
  });

  // ─── Reflect ─────────────────────────────────────────────

  describe('reflect', () => {
    it('should perform a full reflection cycle', async () => {
      engine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 60, estimatedCost: 5 }));
      engine.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 90, estimatedCost: 30 }));

      engine.addCriteria(qualityCriteria());
      engine.addCriteria(costCriteria());

      const result = await engine.reflect();

      expect(result.strategies).toHaveLength(2);
      expect(result.evaluations).toHaveLength(2);
      expect(result.recommendation).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should recommend the highest-scoring strategy', async () => {
      engine.addStrategy(makeStrategy({ id: 'weak', estimatedQuality: 30 }));
      engine.addStrategy(makeStrategy({ id: 'strong', estimatedQuality: 95 }));

      engine.addCriteria({ name: 'quality', weight: 1.0, evaluate: (s) => s.estimatedQuality ?? 0 });

      const result = await engine.reflect();
      expect(result.recommendation).toBe('strong');
    });

    it('should throw when not enough strategies are registered', async () => {
      engine.addStrategy(makeStrategy({ id: 's1' }));
      engine.addCriteria(qualityCriteria());

      await expect(engine.reflect()).rejects.toThrow(
        'Reflection requires at least 2 strategies'
      );
    });

    it('should throw when no strategies are registered', async () => {
      await expect(engine.reflect()).rejects.toThrow(
        'Reflection requires at least 2 strategies'
      );
    });

    it('should produce a fusion strategy when fusion is enabled', async () => {
      engine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 70, estimatedCost: 10 }));
      engine.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 90, estimatedCost: 5 }));

      engine.addCriteria(qualityCriteria());

      const result = await engine.reflect();
      expect(result.fusion).toBeDefined();
      expect(result.fusion!.id).toMatch(/^fused_/);
      expect(result.fusion!.name).toContain('Fused');
    });

    it('should not produce fusion when fusion is disabled', async () => {
      const noFusionEngine = new ReflectionEngine(undefined, { fusionEnabled: false });
      noFusionEngine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 70 }));
      noFusionEngine.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 90 }));
      noFusionEngine.addCriteria(qualityCriteria());

      const result = await noFusionEngine.reflect();
      expect(result.fusion).toBeUndefined();
    });

    it('should store results in history', async () => {
      engine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 70 }));
      engine.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 90 }));
      engine.addCriteria(qualityCriteria());

      await engine.reflect();
      await engine.reflect();

      expect(engine.getHistory()).toHaveLength(2);
    });

    it('should generate reasoning that includes strategy count and recommendation', async () => {
      engine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 60 }));
      engine.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 90 }));
      engine.addCriteria(qualityCriteria());

      const result = await engine.reflect();
      expect(result.reasoning).toContain('2 strategies');
      expect(result.reasoning).toContain('Recommendation');
    });
  });

  // ─── Fusion ──────────────────────────────────────────────

  describe('fuse', () => {
    it('should combine the best aspects of top strategies', () => {
      engine.addStrategy(makeStrategy({
        id: 'cheap-slow',
        estimatedCost: 5,
        estimatedQuality: 60,
        estimatedDuration: 5000,
        riskLevel: 'low',
      }));
      engine.addStrategy(makeStrategy({
        id: 'expensive-fast',
        estimatedCost: 50,
        estimatedQuality: 95,
        estimatedDuration: 500,
        riskLevel: 'high',
      }));

      const fused = engine.fuse(2);

      expect(fused.estimatedCost).toBe(5); // Best (lowest) cost
      expect(fused.estimatedQuality).toBe(95); // Best (highest) quality
      expect(fused.estimatedDuration).toBe(500); // Best (lowest) duration
      expect(fused.riskLevel).toBe('low'); // Lowest risk
    });

    it('should throw when fewer than 2 strategies', () => {
      engine.addStrategy(makeStrategy({ id: 's1' }));
      expect(() => engine.fuse()).toThrow('Fusion requires at least 2 strategies');
    });

    it('should combine approach descriptions', () => {
      engine.addStrategy(makeStrategy({ id: 's1', approach: 'Use caching' }));
      engine.addStrategy(makeStrategy({ id: 's2', approach: 'Use CDN' }));

      const fused = engine.fuse(2);
      expect(fused.approach).toContain('Use caching');
      expect(fused.approach).toContain('Use CDN');
    });

    it('should merge metadata from top strategies', () => {
      engine.addStrategy(makeStrategy({
        id: 's1',
        estimatedQuality: 80,
        metadata: { framework: 'react' },
      }));
      engine.addStrategy(makeStrategy({
        id: 's2',
        estimatedQuality: 70,
        metadata: { deployment: 'k8s' },
      }));

      const fused = engine.fuse(2);
      expect(fused.metadata).toEqual({ framework: 'react', deployment: 'k8s' });
    });

    it('should respect the topN parameter', () => {
      engine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 90 }));
      engine.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 80 }));
      engine.addStrategy(makeStrategy({ id: 's3', estimatedQuality: 40 }));

      const fusedTop2 = engine.fuse(2);
      expect(fusedTop2.name).toContain('s1');
      expect(fusedTop2.name).toContain('s2');
      expect(fusedTop2.name).not.toContain('s3');

      const fusedTop3 = engine.fuse(3);
      expect(fusedTop3.name).toContain('s3');
    });
  });

  // ─── History ─────────────────────────────────────────────

  describe('getHistory / clearHistory', () => {
    it('should return empty history initially', () => {
      expect(engine.getHistory()).toHaveLength(0);
    });

    it('should accumulate reflection results', async () => {
      engine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 70 }));
      engine.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 90 }));
      engine.addCriteria(qualityCriteria());

      await engine.reflect();
      const history = engine.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]!.recommendation).toBe('s2');
    });

    it('should clear history', async () => {
      engine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 70 }));
      engine.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 90 }));
      engine.addCriteria(qualityCriteria());

      await engine.reflect();
      engine.clearHistory();
      expect(engine.getHistory()).toHaveLength(0);
    });
  });

  // ─── EventBus Integration ────────────────────────────────

  describe('EventBus integration', () => {
    it('should emit reflection.completed event after reflect', async () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.subscribe('reflection.completed', handler);

      const engineWithBus = new ReflectionEngine(bus);
      engineWithBus.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 70 }));
      engineWithBus.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 90 }));
      engineWithBus.addCriteria({ name: 'quality', weight: 1.0, evaluate: (s) => s.estimatedQuality ?? 0 });

      await engineWithBus.reflect();

      expect(handler).toHaveBeenCalledOnce();
      const payload = handler.mock.calls[0]![0].payload;
      expect(payload.recommendation).toBe('s2');
      expect(payload.strategiesConsidered).toBe(2);
      expect(payload.topScore).toBe(90);
      expect(payload.fused).toBe(true);
    });

    it('should work without an EventBus', async () => {
      const standaloneEngine = new ReflectionEngine();
      standaloneEngine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 70 }));
      standaloneEngine.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 90 }));
      standaloneEngine.addCriteria(qualityCriteria());

      const result = await standaloneEngine.reflect();
      expect(result.recommendation).toBe('s2');
    });
  });

  // ─── Reset ───────────────────────────────────────────────

  describe('reset', () => {
    it('should clear strategies, criteria, and history', async () => {
      engine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 70 }));
      engine.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 90 }));
      engine.addCriteria(qualityCriteria());

      await engine.reflect();
      engine.reset();

      expect(engine.getStrategies()).toHaveLength(0);
      expect(engine.getCriteria()).toHaveLength(0);
      expect(engine.getHistory()).toHaveLength(0);
    });
  });

  // ─── Multi-criteria Weighted Scoring ─────────────────────

  describe('multi-criteria weighted scoring', () => {
    it('should correctly weight multiple criteria', async () => {
      // Strategy A: cheap but low quality
      engine.addStrategy(makeStrategy({
        id: 'budget',
        estimatedCost: 5,
        estimatedQuality: 50,
        estimatedDuration: 2000,
      }));

      // Strategy B: expensive but high quality and fast
      engine.addStrategy(makeStrategy({
        id: 'premium',
        estimatedCost: 50,
        estimatedQuality: 95,
        estimatedDuration: 500,
      }));

      engine.addCriteria(costCriteria());     // weight 0.3
      engine.addCriteria(qualityCriteria());   // weight 0.5
      engine.addCriteria(speedCriteria());     // weight 0.2

      const results = await engine.evaluate();

      const budgetResult = results.find((r) => r.strategyId === 'budget')!;
      const premiumResult = results.find((r) => r.strategyId === 'premium')!;

      // Quality has 0.5 weight, so premium should win overall
      expect(premiumResult.weightedScore).toBeGreaterThan(budgetResult.weightedScore);
    });

    it('should recommend budget strategy when cost is heavily weighted', async () => {
      engine.addStrategy(makeStrategy({
        id: 'budget',
        estimatedCost: 5,
        estimatedQuality: 50,
      }));
      engine.addStrategy(makeStrategy({
        id: 'premium',
        estimatedCost: 50,
        estimatedQuality: 95,
      }));

      // Cost is king
      engine.addCriteria({ name: 'cost', weight: 0.9, evaluate: (s) => 100 - (s.estimatedCost ?? 50) });
      engine.addCriteria({ name: 'quality', weight: 0.1, evaluate: (s) => s.estimatedQuality ?? 50 });

      const result = await engine.reflect();
      expect(result.recommendation).toBe('budget');
    });
  });

  // ─── Custom Evaluation Criteria ──────────────────────────

  describe('custom evaluation criteria', () => {
    it('should support security as a custom criterion', async () => {
      engine.addStrategy(makeStrategy({
        id: 'secure',
        metadata: { vulnerabilities: 0 },
      }));
      engine.addStrategy(makeStrategy({
        id: 'risky',
        metadata: { vulnerabilities: 5 },
      }));

      engine.addCriteria({
        name: 'security',
        weight: 1.0,
        evaluate: (s) => {
          const vulns = (s.metadata?.vulnerabilities as number) ?? 10;
          return Math.max(0, 100 - vulns * 20);
        },
      });

      const result = await engine.reflect();
      expect(result.recommendation).toBe('secure');
    });

    it('should support maintainability as a custom criterion', async () => {
      engine.addStrategy(makeStrategy({
        id: 'clean',
        metadata: { complexity: 3 },
      }));
      engine.addStrategy(makeStrategy({
        id: 'complex',
        metadata: { complexity: 15 },
      }));

      engine.addCriteria({
        name: 'maintainability',
        weight: 1.0,
        evaluate: (s) => {
          const complexity = (s.metadata?.complexity as number) ?? 20;
          return Math.max(0, 100 - complexity * 5);
        },
      });

      const result = await engine.reflect();
      expect(result.recommendation).toBe('clean');
    });
  });

  // ─── Configuration ───────────────────────────────────────

  describe('configuration', () => {
    it('should respect minStrategies config', async () => {
      const strictEngine = new ReflectionEngine(undefined, { minStrategies: 3 });
      strictEngine.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 70 }));
      strictEngine.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 90 }));

      await expect(strictEngine.reflect()).rejects.toThrow(
        'Reflection requires at least 3 strategies'
      );
    });

    it('should respect fusionTopN config', async () => {
      const engine3 = new ReflectionEngine(undefined, { fusionTopN: 3 });
      engine3.addStrategy(makeStrategy({ id: 's1', estimatedQuality: 90 }));
      engine3.addStrategy(makeStrategy({ id: 's2', estimatedQuality: 80 }));
      engine3.addStrategy(makeStrategy({ id: 's3', estimatedQuality: 70 }));
      engine3.addCriteria(qualityCriteria());

      const result = await engine3.reflect();
      expect(result.fusion).toBeDefined();
      expect(result.fusion!.name).toContain('s1');
      expect(result.fusion!.name).toContain('s2');
      expect(result.fusion!.name).toContain('s3');
    });
  });
});
