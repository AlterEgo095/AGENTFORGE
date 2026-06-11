/**
 * ALTER EGO OS — Learning Engine Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningEngine } from '../index.js';
import type {
  MissionOutcome,
  OutcomeStatus,
  LearningPattern,
  Prediction,
  LearningInsight,
} from '../index.js';
import { EventBus } from '../../../event-bus/src/index.js';

// ─── Helpers ──────────────────────────────────────────────────

let outcomeCounter = 0;

function makeOutcome(overrides: Partial<MissionOutcome> & { missionType: string }): MissionOutcome {
  outcomeCounter++;
  return {
    id: `outcome-${outcomeCounter}`,
    missionId: `mission-${outcomeCounter}`,
    status: 'success',
    qualityScore: 75,
    costUsd: 0.5,
    durationMs: 5000,
    modelUsed: 'gpt-4',
    agentsUsed: ['agent-1'],
    corrections: 1,
    errorTypes: [],
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────

describe('LearningEngine', () => {
  let engine: LearningEngine;

  beforeEach(() => {
    engine = new LearningEngine(undefined, { autoDiscoverPatterns: false });
    outcomeCounter = 0;
  });

  // ─── Outcome Recording ───────────────────────────────────

  describe('recordOutcome', () => {
    it('should record a mission outcome', async () => {
      const outcome = makeOutcome({ missionType: 'code-gen' });
      await engine.recordOutcome(outcome);

      const history = engine.getOutcomeHistory();
      expect(history).toHaveLength(1);
      expect(history[0]!.id).toBe(outcome.id);
    });

    it('should record multiple outcomes', async () => {
      await engine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));
      await engine.recordOutcome(makeOutcome({ missionType: 'testing' }));
      await engine.recordOutcome(makeOutcome({ missionType: 'refactoring' }));

      expect(engine.getOutcomeHistory()).toHaveLength(3);
    });

    it('should emit learning.outcome.recorded event', async () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.subscribe('learning.outcome.recorded', handler);

      const engineWithBus = new LearningEngine(bus, { autoDiscoverPatterns: false });
      const outcome = makeOutcome({ missionType: 'code-gen' });

      await engineWithBus.recordOutcome(outcome);

      expect(handler).toHaveBeenCalledOnce();
      const payload = handler.mock.calls[0]![0].payload;
      expect(payload.outcomeId).toBe(outcome.id);
      expect(payload.missionType).toBe('code-gen');
      expect(payload.status).toBe('success');
    });

    it('should enforce max outcomes limit', async () => {
      const limitedEngine = new LearningEngine(undefined, {
        maxOutcomes: 5,
        autoDiscoverPatterns: false,
      });

      for (let i = 0; i < 10; i++) {
        await limitedEngine.recordOutcome(
          makeOutcome({ missionType: 'code-gen', id: `o-${i}` })
        );
      }

      expect(limitedEngine.getOutcomeHistory()).toHaveLength(5);
      // Oldest outcomes should have been removed
      const history = limitedEngine.getOutcomeHistory();
      expect(history.find((o) => o.id === 'o-0')).toBeUndefined();
    });
  });

  // ─── Outcome History ─────────────────────────────────────

  describe('getOutcomeHistory', () => {
    it('should return all outcomes when no filter is applied', async () => {
      await engine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));
      await engine.recordOutcome(makeOutcome({ missionType: 'testing' }));

      expect(engine.getOutcomeHistory()).toHaveLength(2);
    });

    it('should filter by mission type', async () => {
      await engine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));
      await engine.recordOutcome(makeOutcome({ missionType: 'testing' }));
      await engine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));

      const codeGenOutcomes = engine.getOutcomeHistory('code-gen');
      expect(codeGenOutcomes).toHaveLength(2);
      expect(codeGenOutcomes.every((o) => o.missionType === 'code-gen')).toBe(true);
    });

    it('should limit the number of results', async () => {
      for (let i = 0; i < 10; i++) {
        await engine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));
      }

      const limited = engine.getOutcomeHistory('code-gen', 3);
      expect(limited).toHaveLength(3);
    });

    it('should return outcomes sorted by timestamp descending', async () => {
      await engine.recordOutcome(
        makeOutcome({ missionType: 'code-gen', timestamp: '2024-01-01T00:00:00Z' })
      );
      await engine.recordOutcome(
        makeOutcome({ missionType: 'code-gen', timestamp: '2024-01-03T00:00:00Z' })
      );
      await engine.recordOutcome(
        makeOutcome({ missionType: 'code-gen', timestamp: '2024-01-02T00:00:00Z' })
      );

      const history = engine.getOutcomeHistory('code-gen');
      expect(history[0]!.timestamp).toBe('2024-01-03T00:00:00Z');
      expect(history[2]!.timestamp).toBe('2024-01-01T00:00:00Z');
    });
  });

  // ─── Pattern Discovery ───────────────────────────────────

  describe('getPatterns', () => {
    it('should discover patterns from outcomes', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      // Record enough outcomes for pattern discovery
      for (let i = 0; i < 5; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({ missionType: 'code-gen', modelUsed: 'gpt-4' })
        );
      }

      const patterns = await autoEngine.getPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      // Should at least have an "Overall performance" pattern
      expect(patterns.some((p) => p.pattern.includes('Overall performance'))).toBe(true);
    });

    it('should filter patterns by mission type', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      for (let i = 0; i < 5; i++) {
        await autoEngine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));
      }
      for (let i = 0; i < 5; i++) {
        await autoEngine.recordOutcome(makeOutcome({ missionType: 'testing' }));
      }

      const codeGenPatterns = await autoEngine.getPatterns('code-gen');
      expect(codeGenPatterns.every((p) => p.missionType === 'code-gen')).toBe(true);
    });

    it('should discover model-based patterns', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      for (let i = 0; i < 3; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({ missionType: 'code-gen', modelUsed: 'gpt-4' })
        );
      }
      for (let i = 0; i < 3; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({ missionType: 'code-gen', modelUsed: 'claude-3' })
        );
      }

      const patterns = await autoEngine.getPatterns('code-gen');
      expect(patterns.some((p) => p.pattern.includes('gpt-4'))).toBe(true);
      expect(patterns.some((p) => p.pattern.includes('claude-3'))).toBe(true);
    });

    it('should discover error-type patterns', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      for (let i = 0; i < 5; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            errorTypes: ['syntax-error'],
            status: 'failure',
          })
        );
      }

      const patterns = await autoEngine.getPatterns('code-gen');
      expect(patterns.some((p) => p.pattern.includes('syntax-error'))).toBe(true);
    });

    it('should calculate correct pattern statistics', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      await autoEngine.recordOutcome(
        makeOutcome({
          missionType: 'code-gen',
          qualityScore: 80,
          costUsd: 1.0,
          durationMs: 10000,
          status: 'success',
        })
      );
      await autoEngine.recordOutcome(
        makeOutcome({
          missionType: 'code-gen',
          qualityScore: 90,
          costUsd: 2.0,
          durationMs: 20000,
          status: 'success',
        })
      );
      await autoEngine.recordOutcome(
        makeOutcome({
          missionType: 'code-gen',
          qualityScore: 70,
          costUsd: 1.5,
          durationMs: 15000,
          status: 'failure',
        })
      );

      const patterns = await autoEngine.getPatterns('code-gen');
      const overallPattern = patterns.find((p) => p.pattern.includes('Overall performance'));
      expect(overallPattern).toBeDefined();
      expect(overallPattern!.frequency).toBe(3);
      expect(overallPattern!.avgQuality).toBe(80); // (80+90+70)/3
      expect(overallPattern!.avgCost).toBe(1.5); // (1+2+1.5)/3
      expect(overallPattern!.successRate).toBeGreaterThanOrEqual(0.66);
      expect(overallPattern!.successRate).toBeLessThanOrEqual(0.67);
    });

    it('should emit learning.pattern.discovered events', async () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.subscribe('learning.pattern.discovered', handler);

      const autoEngine = new LearningEngine(bus, { autoDiscoverPatterns: true });

      for (let i = 0; i < 5; i++) {
        await autoEngine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));
      }

      // Should have emitted at least one pattern event
      expect(handler).toHaveBeenCalled();
    });
  });

  // ─── Prediction ──────────────────────────────────────────

  describe('predict', () => {
    it('should return zero confidence when not enough outcomes', () => {
      const prediction = engine.predict('code-gen');
      expect(prediction.confidence).toBe(0);
      expect(prediction.basedOnOutcomes).toBe(0);
    });

    it('should predict based on historical data', async () => {
      for (let i = 0; i < 5; i++) {
        await engine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            costUsd: 1.0,
            qualityScore: 80,
            durationMs: 10000,
          })
        );
      }

      const prediction = engine.predict('code-gen');
      expect(prediction.basedOnOutcomes).toBe(5);
      expect(prediction.estimatedCost).toBeGreaterThan(0);
      expect(prediction.estimatedQuality).toBeGreaterThan(0);
      expect(prediction.estimatedDuration).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    it('should give higher confidence with more data', async () => {
      // Few outcomes
      for (let i = 0; i < 3; i++) {
        await engine.recordOutcome(makeOutcome({ missionType: 'sparse' }));
      }

      // Many outcomes
      const manyEngine = new LearningEngine(undefined, { autoDiscoverPatterns: false });
      for (let i = 0; i < 15; i++) {
        await manyEngine.recordOutcome(makeOutcome({ missionType: 'dense' }));
      }

      const sparsePrediction = engine.predict('sparse');
      const densePrediction = manyEngine.predict('dense');

      expect(densePrediction.confidence).toBeGreaterThan(sparsePrediction.confidence);
    });

    it('should use recent outcomes more heavily (EWMA)', async () => {
      // Old outcomes: cheap, low quality
      for (let i = 0; i < 5; i++) {
        await engine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            costUsd: 0.1,
            qualityScore: 30,
            durationMs: 1000,
            timestamp: '2024-01-01T00:00:00Z',
          })
        );
      }

      // Recent outcomes: expensive, high quality
      for (let i = 0; i < 5; i++) {
        await engine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            costUsd: 5.0,
            qualityScore: 95,
            durationMs: 50000,
            timestamp: '2024-06-01T00:00:00Z',
          })
        );
      }

      const prediction = engine.predict('code-gen');
      // Prediction should be closer to the recent outcomes
      expect(prediction.estimatedQuality).toBeGreaterThan(60);
      expect(prediction.estimatedCost).toBeGreaterThan(2);
    });

    it('should predict independently for different mission types', async () => {
      for (let i = 0; i < 5; i++) {
        await engine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            costUsd: 1.0,
            qualityScore: 80,
          })
        );
      }
      for (let i = 0; i < 5; i++) {
        await engine.recordOutcome(
          makeOutcome({
            missionType: 'testing',
            costUsd: 0.5,
            qualityScore: 90,
          })
        );
      }

      const codeGenPred = engine.predict('code-gen');
      const testingPred = engine.predict('testing');

      expect(codeGenPred.estimatedCost).not.toBe(testingPred.estimatedCost);
      expect(testingPred.estimatedQuality).toBeGreaterThan(codeGenPred.estimatedQuality);
    });
  });

  // ─── Insights ────────────────────────────────────────────

  describe('getInsights', () => {
    it('should return empty insights when insufficient data', async () => {
      await engine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));
      const insights = await engine.getInsights();
      // With auto-discover off and only 1 outcome, no insights should exist
      expect(insights).toHaveLength(0);
    });

    it('should generate warning insights for low success rates', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      // Create mostly failing outcomes
      for (let i = 0; i < 5; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            status: 'failure' as OutcomeStatus,
            qualityScore: 30,
          })
        );
      }

      const insights = await autoEngine.getInsights();
      const warning = insights.find(
        (i) => i.type === 'warning' && i.description.includes('low success rate')
      );
      expect(warning).toBeDefined();
    });

    it('should generate best_practice insights for high success rates', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      for (let i = 0; i < 5; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            status: 'success',
            qualityScore: 90,
          })
        );
      }

      const insights = await autoEngine.getInsights();
      const bestPractice = insights.find(
        (i) => i.type === 'best_practice' && i.description.includes('consistently succeed')
      );
      expect(bestPractice).toBeDefined();
    });

    it('should generate optimization insights for model performance', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      // gpt-4: high quality
      for (let i = 0; i < 3; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            modelUsed: 'gpt-4',
            qualityScore: 95,
          })
        );
      }
      // gpt-3.5: lower quality
      for (let i = 0; i < 3; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            modelUsed: 'gpt-3.5',
            qualityScore: 50,
          })
        );
      }

      const insights = await autoEngine.getInsights();
      const optimization = insights.find(
        (i) => i.type === 'optimization' && i.description.includes('gpt-4')
      );
      expect(optimization).toBeDefined();
    });

    it('should generate warning for high correction rates', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      for (let i = 0; i < 5; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            corrections: 7,
          })
        );
      }

      const insights = await autoEngine.getInsights();
      const correctionWarning = insights.find(
        (i) => i.type === 'warning' && i.description.includes('corrections')
      );
      expect(correctionWarning).toBeDefined();
    });

    it('should generate warning for recurring error types', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      for (let i = 0; i < 5; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            errorTypes: ['timeout-error'],
          })
        );
      }

      const insights = await autoEngine.getInsights();
      const errorWarning = insights.find(
        (i) => i.type === 'warning' && i.description.includes('timeout-error')
      );
      expect(errorWarning).toBeDefined();
    });

    it('should emit learning.insight.generated events', async () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.subscribe('learning.insight.generated', handler);

      const autoEngine = new LearningEngine(bus, { autoDiscoverPatterns: true });

      for (let i = 0; i < 5; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({ missionType: 'code-gen', status: 'failure' as OutcomeStatus })
        );
      }

      // Should have emitted insight events
      expect(handler).toHaveBeenCalled();
      const payload = handler.mock.calls[0]![0].payload;
      expect(payload).toHaveProperty('type');
      expect(payload).toHaveProperty('description');
      expect(payload).toHaveProperty('impact');
    });
  });

  // ─── Stats ───────────────────────────────────────────────

  describe('getStats', () => {
    it('should return empty stats initially', () => {
      const stats = engine.getStats();
      expect(stats.totalOutcomes).toBe(0);
      expect(stats.missionTypes).toBe(0);
      expect(stats.patternCount).toBe(0);
      expect(stats.insightCount).toBe(0);
      expect(stats.overallSuccessRate).toBe(0);
    });

    it('should track total outcomes and mission types', async () => {
      await engine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));
      await engine.recordOutcome(makeOutcome({ missionType: 'testing' }));
      await engine.recordOutcome(makeOutcome({ missionType: 'refactoring' }));

      const stats = engine.getStats();
      expect(stats.totalOutcomes).toBe(3);
      expect(stats.missionTypes).toBe(3);
    });

    it('should calculate overall success rate', async () => {
      await engine.recordOutcome(makeOutcome({ missionType: 'code-gen', status: 'success' }));
      await engine.recordOutcome(makeOutcome({ missionType: 'code-gen', status: 'success' }));
      await engine.recordOutcome(makeOutcome({ missionType: 'code-gen', status: 'failure' }));

      const stats = engine.getStats();
      expect(stats.overallSuccessRate).toBeCloseTo(0.67, 1);
    });

    it('should calculate averages', async () => {
      await engine.recordOutcome(
        makeOutcome({
          missionType: 'code-gen',
          qualityScore: 80,
          costUsd: 1.0,
          durationMs: 10000,
        })
      );
      await engine.recordOutcome(
        makeOutcome({
          missionType: 'code-gen',
          qualityScore: 60,
          costUsd: 2.0,
          durationMs: 20000,
        })
      );

      const stats = engine.getStats();
      expect(stats.avgQuality).toBe(70);
      expect(stats.avgCost).toBe(1.5);
      expect(stats.avgDuration).toBe(15000);
    });

    it('should track prediction accuracy', () => {
      engine.recordPredictionAccuracy({
        missionType: 'code-gen',
        predictedCost: 1.0,
        actualCost: 1.2,
        predictedQuality: 80,
        actualQuality: 75,
        predictedDuration: 10000,
        actualDuration: 12000,
      });

      const stats = engine.getStats();
      expect(stats.predictionAccuracy.totalPredictions).toBe(1);
      expect(stats.predictionAccuracy.avgCostError).toBe(0.2);
      expect(stats.predictionAccuracy.avgQualityError).toBe(5);
      expect(stats.predictionAccuracy.avgDurationError).toBe(2000);
    });
  });

  // ─── Prediction Accuracy Tracking ────────────────────────

  describe('recordPredictionAccuracy', () => {
    it('should accumulate prediction accuracy records', () => {
      engine.recordPredictionAccuracy({
        missionType: 'code-gen',
        predictedCost: 1.0,
        actualCost: 1.5,
        predictedQuality: 80,
        actualQuality: 85,
        predictedDuration: 10000,
        actualDuration: 8000,
      });
      engine.recordPredictionAccuracy({
        missionType: 'code-gen',
        predictedCost: 2.0,
        actualCost: 1.5,
        predictedQuality: 70,
        actualQuality: 75,
        predictedDuration: 20000,
        actualDuration: 18000,
      });

      const stats = engine.getStats();
      expect(stats.predictionAccuracy.totalPredictions).toBe(2);
      // avgCostError = (|1.0-1.5| + |2.0-1.5|) / 2 = 0.5
      expect(stats.predictionAccuracy.avgCostError).toBe(0.5);
    });
  });

  // ─── EventBus Integration ────────────────────────────────

  describe('EventBus integration', () => {
    it('should work without an EventBus', async () => {
      const standaloneEngine = new LearningEngine(undefined, { autoDiscoverPatterns: false });
      await standaloneEngine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));

      expect(standaloneEngine.getOutcomeHistory()).toHaveLength(1);
    });

    it('should emit all three event types', async () => {
      const bus = new EventBus();
      const outcomeHandler = vi.fn();
      const patternHandler = vi.fn();
      const insightHandler = vi.fn();

      bus.subscribe('learning.outcome.recorded', outcomeHandler);
      bus.subscribe('learning.pattern.discovered', patternHandler);
      bus.subscribe('learning.insight.generated', insightHandler);

      const engineWithBus = new LearningEngine(bus, { autoDiscoverPatterns: true });

      // Record enough outcomes to trigger pattern discovery and insight generation
      for (let i = 0; i < 5; i++) {
        await engineWithBus.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            status: 'failure' as OutcomeStatus,
            qualityScore: 30,
          })
        );
      }

      expect(outcomeHandler).toHaveBeenCalledTimes(5);
      expect(patternHandler).toHaveBeenCalled();
      expect(insightHandler).toHaveBeenCalled();
    });
  });

  // ─── Reset ───────────────────────────────────────────────

  describe('reset', () => {
    it('should clear all data', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      for (let i = 0; i < 5; i++) {
        await autoEngine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));
      }

      autoEngine.reset();

      expect(autoEngine.getOutcomeHistory()).toHaveLength(0);
      expect(await autoEngine.getPatterns()).toHaveLength(0);
      expect(await autoEngine.getInsights()).toHaveLength(0);

      const stats = autoEngine.getStats();
      expect(stats.totalOutcomes).toBe(0);
      expect(stats.patternCount).toBe(0);
      expect(stats.insightCount).toBe(0);
    });
  });

  // ─── End-to-End Learning Flow ────────────────────────────

  describe('end-to-end learning flow', () => {
    it('should learn from outcomes and improve predictions over time', async () => {
      const autoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: true });

      // Phase 1: Record initial outcomes
      for (let i = 0; i < 3; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            costUsd: 1.0,
            qualityScore: 70,
            durationMs: 10000,
            modelUsed: 'gpt-3.5',
          })
        );
      }

      const initialPrediction = autoEngine.predict('code-gen');
      expect(initialPrediction.confidence).toBeGreaterThan(0);

      // Phase 2: Record more outcomes with a better model
      for (let i = 0; i < 10; i++) {
        await autoEngine.recordOutcome(
          makeOutcome({
            missionType: 'code-gen',
            costUsd: 2.0,
            qualityScore: 90,
            durationMs: 5000,
            modelUsed: 'gpt-4',
          })
        );
      }

      const laterPrediction = autoEngine.predict('code-gen');
      expect(laterPrediction.confidence).toBeGreaterThan(initialPrediction.confidence);

      // Phase 3: Check patterns and insights were generated
      const patterns = await autoEngine.getPatterns('code-gen');
      expect(patterns.length).toBeGreaterThan(0);

      const insights = await autoEngine.getInsights();
      expect(insights.length).toBeGreaterThan(0);

      // Phase 4: Check stats
      const stats = autoEngine.getStats();
      expect(stats.totalOutcomes).toBe(13);
      expect(stats.missionTypes).toBe(1);
    });
  });

  // ─── Configuration ───────────────────────────────────────

  describe('configuration', () => {
    it('should respect minOutcomesForPrediction config', () => {
      const strictEngine = new LearningEngine(undefined, {
        minOutcomesForPrediction: 5,
        autoDiscoverPatterns: false,
      });

      // Only 3 outcomes, but config requires 5
      const prediction = strictEngine.predict('code-gen');
      expect(prediction.confidence).toBe(0);
      expect(prediction.basedOnOutcomes).toBe(0);
    });

    it('should disable auto pattern discovery when configured', async () => {
      const noAutoEngine = new LearningEngine(undefined, { autoDiscoverPatterns: false });

      for (let i = 0; i < 5; i++) {
        await noAutoEngine.recordOutcome(makeOutcome({ missionType: 'code-gen' }));
      }

      const patterns = await noAutoEngine.getPatterns();
      expect(patterns).toHaveLength(0);
    });
  });
});
