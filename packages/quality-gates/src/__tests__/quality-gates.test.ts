/**
 * ALTER EGO OS — Quality Gates Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QualityGateRunner } from '../quality-gates.js';
import type { QualityGate, CompositeGate, GateResult } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────

function makeGate(overrides: Partial<QualityGate> = {}): QualityGate {
  return {
    id: overrides.id ?? 'gate-1',
    domain: overrides.domain ?? 'architecture',
    name: overrides.name ?? 'Test Gate',
    description: overrides.description ?? 'A test quality gate',
    threshold: overrides.threshold ?? 70,
    validate:
      overrides.validate ??
      (async (input: unknown) => {
        const score = (input as { score?: number })?.score ?? 100;
        return {
          gateId: overrides.id ?? 'gate-1',
          domain: overrides.domain ?? 'architecture',
          status: score >= (overrides.threshold ?? 70) ? 'passed' : 'failed',
          score,
          threshold: overrides.threshold ?? 70,
          message: `Score: ${score}`,
          timestamp: new Date().toISOString(),
        } satisfies GateResult;
      }),
  };
}

// ─── Tests ────────────────────────────────────────────────────

describe('QualityGateRunner', () => {
  let runner: QualityGateRunner;

  beforeEach(() => {
    runner = new QualityGateRunner();
  });

  // ─── Registration ───────────────────────────────────────

  describe('registerGate', () => {
    it('should register a quality gate', () => {
      const gate = makeGate();
      runner.registerGate(gate);
      expect(runner.getGate('gate-1')).toBe(gate);
    });

    it('should throw when registering a duplicate gate', () => {
      runner.registerGate(makeGate());
      expect(() => runner.registerGate(makeGate())).toThrow('already registered');
    });

    it('should list registered gates', () => {
      runner.registerGate(makeGate({ id: 'g1' }));
      runner.registerGate(makeGate({ id: 'g2' }));
      expect(runner.listGates()).toEqual(['g1', 'g2']);
    });
  });

  describe('registerCompositeGate', () => {
    it('should register a composite gate', () => {
      runner.registerCompositeGate({
        id: 'comp-1',
        name: 'All Architecture',
        operator: 'and',
        gateIds: ['gate-1', 'gate-2'],
      });
      expect(runner.getCompositeGate('comp-1')).toBeDefined();
    });

    it('should throw when registering a duplicate composite gate', () => {
      runner.registerCompositeGate({
        id: 'comp-1',
        name: 'All Architecture',
        operator: 'and',
        gateIds: [],
      });
      expect(() =>
        runner.registerCompositeGate({
          id: 'comp-1',
          name: 'Duplicate',
          operator: 'or',
          gateIds: [],
        })
      ).toThrow('already registered');
    });
  });

  // ─── Single Gate Execution ──────────────────────────────

  describe('runGate', () => {
    it('should run a single gate and return the result', async () => {
      runner.registerGate(makeGate({ id: 'g1', threshold: 70 }));
      const result = await runner.runGate('g1', { score: 85 });
      expect(result.gateId).toBe('g1');
      expect(result.status).toBe('passed');
      expect(result.score).toBe(85);
    });

    it('should return failed when score is below threshold', async () => {
      runner.registerGate(makeGate({ id: 'g1', threshold: 70 }));
      const result = await runner.runGate('g1', { score: 50 });
      expect(result.status).toBe('failed');
      expect(result.score).toBe(50);
    });

    it('should throw when gate is not found', async () => {
      await expect(runner.runGate('nonexistent', {})).rejects.toThrow('not found');
    });

    it('should handle validator that throws an error', async () => {
      runner.registerGate(
        makeGate({
          id: 'error-gate',
          validate: async () => {
            throw new Error('Validator exploded');
          },
        })
      );
      const result = await runner.runGate('error-gate', {});
      expect(result.status).toBe('failed');
      expect(result.score).toBe(0);
      expect(result.message).toContain('Validator exploded');
    });

    it('should clamp score to 0-100 range', async () => {
      runner.registerGate(
        makeGate({
          id: 'overflow-gate',
          validate: async () => ({
            gateId: 'overflow-gate',
            domain: 'architecture' as const,
            status: 'passed' as const,
            score: 150,
            threshold: 70,
            message: 'Overflow',
            timestamp: new Date().toISOString(),
          }),
        })
      );
      const result = await runner.runGate('overflow-gate', {});
      expect(result.score).toBe(100);
    });

    it('should include auto-fix suggestion in result', async () => {
      runner.registerGate(
        makeGate({
          id: 'fix-gate',
          threshold: 80,
          validate: async () => ({
            gateId: 'fix-gate',
            domain: 'security' as const,
            status: 'failed' as const,
            score: 40,
            threshold: 80,
            message: 'Security vulnerabilities found',
            autoFixSuggestion: 'Run npm audit fix to resolve vulnerabilities',
            timestamp: new Date().toISOString(),
          }),
        })
      );
      const result = await runner.runGate('fix-gate', {});
      expect(result.autoFixSuggestion).toBe('Run npm audit fix to resolve vulnerabilities');
    });

    it('should include details in result', async () => {
      runner.registerGate(
        makeGate({
          id: 'detail-gate',
          validate: async () => ({
            gateId: 'detail-gate',
            domain: 'tests' as const,
            status: 'passed' as const,
            score: 90,
            threshold: 70,
            message: 'Test coverage sufficient',
            details: { coverage: 90, files: 42, passing: 40 },
            timestamp: new Date().toISOString(),
          }),
        })
      );
      const result = await runner.runGate('detail-gate', {});
      expect(result.details).toEqual({ coverage: 90, files: 42, passing: 40 });
    });
  });

  // ─── Run All ────────────────────────────────────────────

  describe('runAll', () => {
    it('should run all registered gates', async () => {
      runner.registerGate(makeGate({ id: 'g1', domain: 'architecture' }));
      runner.registerGate(makeGate({ id: 'g2', domain: 'security' }));
      runner.registerGate(makeGate({ id: 'g3', domain: 'tests' }));

      const results = await runner.runAll({ score: 100 });
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.gateId).sort()).toEqual(['g1', 'g2', 'g3']);
    });

    it('should return empty array when no gates are registered', async () => {
      const results = await runner.runAll({});
      expect(results).toEqual([]);
    });
  });

  // ─── Run Domain ─────────────────────────────────────────

  describe('runDomain', () => {
    it('should run only gates in the specified domain', async () => {
      runner.registerGate(makeGate({ id: 'arch-1', domain: 'architecture' }));
      runner.registerGate(makeGate({ id: 'arch-2', domain: 'architecture' }));
      runner.registerGate(makeGate({ id: 'sec-1', domain: 'security' }));

      const results = await runner.runDomain('architecture', { score: 100 });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.domain === 'architecture')).toBe(true);
    });

    it('should return empty when no gates exist for domain', async () => {
      runner.registerGate(makeGate({ id: 'g1', domain: 'architecture' }));
      const results = await runner.runDomain('performance', {});
      expect(results).toEqual([]);
    });
  });

  // ─── Composite Gates ────────────────────────────────────

  describe('runComposite (AND)', () => {
    beforeEach(() => {
      runner.registerGate(makeGate({ id: 'g1', domain: 'architecture', threshold: 70 }));
      runner.registerGate(makeGate({ id: 'g2', domain: 'security', threshold: 70 }));
      runner.registerCompositeGate({
        id: 'comp-and',
        name: 'Arch AND Security',
        operator: 'and',
        gateIds: ['g1', 'g2'],
      });
    });

    it('should pass when ALL sub-gates pass (AND)', async () => {
      const result = await runner.runComposite('comp-and', { score: 80 });
      expect(result.status).toBe('passed');
    });

    it('should fail when ANY sub-gate fails (AND)', async () => {
      const result = await runner.runComposite('comp-and', { score: 50 });
      expect(result.status).toBe('failed');
    });

    it('should produce warning when some sub-gates have warnings (AND)', async () => {
      // Score 56 = 70*0.8 = 56, so it's a warning zone
      runner.registerGate(
        makeGate({
          id: 'g3',
          domain: 'performance',
          threshold: 70,
          validate: async () => ({
            gateId: 'g3',
            domain: 'performance' as const,
            status: 'warning' as const,
            score: 60,
            threshold: 70,
            message: 'Below threshold but close',
            timestamp: new Date().toISOString(),
          }),
        })
      );
      runner.registerGate(makeGate({ id: 'g4', domain: 'tests', threshold: 70 }));
      runner.registerCompositeGate({
        id: 'comp-and-warn',
        name: 'Warn AND',
        operator: 'and',
        gateIds: ['g3', 'g4'],
      });

      const result = await runner.runComposite('comp-and-warn', { score: 80 });
      expect(result.status).toBe('warning');
    });
  });

  describe('runComposite (OR)', () => {
    beforeEach(() => {
      runner.registerGate(makeGate({ id: 'g1', domain: 'architecture', threshold: 70 }));
      runner.registerGate(makeGate({ id: 'g2', domain: 'security', threshold: 70 }));
      runner.registerCompositeGate({
        id: 'comp-or',
        name: 'Arch OR Security',
        operator: 'or',
        gateIds: ['g1', 'g2'],
      });
    });

    it('should pass when ANY sub-gate passes (OR)', async () => {
      const result = await runner.runComposite('comp-or', { score: 80 });
      expect(result.status).toBe('passed');
    });

    it('should fail when ALL sub-gates fail (OR)', async () => {
      const result = await runner.runComposite('comp-or', { score: 50 });
      expect(result.status).toBe('failed');
    });
  });

  describe('runComposite errors', () => {
    it('should throw when composite gate is not found', async () => {
      await expect(runner.runComposite('nonexistent', {})).rejects.toThrow('not found');
    });

    it('should throw when a sub-gate in composite is not registered', async () => {
      runner.registerCompositeGate({
        id: 'comp-missing',
        name: 'Missing sub-gate',
        operator: 'and',
        gateIds: ['nonexistent-gate'],
      });
      await expect(runner.runComposite('comp-missing', {})).rejects.toThrow('not found');
    });
  });

  // ─── Report Generation ──────────────────────────────────

  describe('generateReport', () => {
    it('should generate a report with overall passed status', () => {
      const results: GateResult[] = [
        {
          gateId: 'g1',
          domain: 'architecture',
          status: 'passed',
          score: 90,
          threshold: 70,
          message: 'OK',
          timestamp: new Date().toISOString(),
        },
        {
          gateId: 'g2',
          domain: 'security',
          status: 'passed',
          score: 85,
          threshold: 70,
          message: 'OK',
          timestamp: new Date().toISOString(),
        },
      ];

      const report = runner.generateReport(results);
      expect(report.overallStatus).toBe('passed');
      expect(report.overallScore).toBe(88); // (90+85)/2 = 87.5 → 88
      expect(report.passedCount).toBe(2);
      expect(report.failedCount).toBe(0);
      expect(report.warningCount).toBe(0);
      expect(report.gateResults).toEqual(results);
    });

    it('should generate a report with overall failed status', () => {
      const results: GateResult[] = [
        {
          gateId: 'g1',
          domain: 'architecture',
          status: 'passed',
          score: 90,
          threshold: 70,
          message: 'OK',
          timestamp: new Date().toISOString(),
        },
        {
          gateId: 'g2',
          domain: 'security',
          status: 'failed',
          score: 40,
          threshold: 70,
          message: 'Security issues',
          timestamp: new Date().toISOString(),
        },
      ];

      const report = runner.generateReport(results);
      expect(report.overallStatus).toBe('failed');
      expect(report.passedCount).toBe(1);
      expect(report.failedCount).toBe(1);
    });

    it('should generate a report with warning status', () => {
      const results: GateResult[] = [
        {
          gateId: 'g1',
          domain: 'architecture',
          status: 'passed',
          score: 90,
          threshold: 70,
          message: 'OK',
          timestamp: new Date().toISOString(),
        },
        {
          gateId: 'g2',
          domain: 'security',
          status: 'warning',
          score: 65,
          threshold: 70,
          message: 'Near threshold',
          timestamp: new Date().toISOString(),
        },
      ];

      const report = runner.generateReport(results);
      expect(report.overallStatus).toBe('warning');
      expect(report.warningCount).toBe(1);
    });

    it('should return skipped status for empty results', () => {
      const report = runner.generateReport([]);
      expect(report.overallStatus).toBe('skipped');
      expect(report.overallScore).toBe(0);
    });
  });

  // ─── Remove Gates ───────────────────────────────────────

  describe('removeGate', () => {
    it('should remove a registered gate', () => {
      runner.registerGate(makeGate({ id: 'g1' }));
      expect(runner.removeGate('g1')).toBe(true);
      expect(runner.getGate('g1')).toBeUndefined();
    });

    it('should return false for non-existent gate', () => {
      expect(runner.removeGate('nonexistent')).toBe(false);
    });
  });

  describe('removeCompositeGate', () => {
    it('should remove a registered composite gate', () => {
      runner.registerCompositeGate({ id: 'c1', name: 'C1', operator: 'and', gateIds: [] });
      expect(runner.removeCompositeGate('c1')).toBe(true);
      expect(runner.getCompositeGate('c1')).toBeUndefined();
    });
  });

  // ─── Multiple Domains ───────────────────────────────────

  describe('multiple domains', () => {
    it('should support all gate domains', async () => {
      const domains = [
        'architecture',
        'security',
        'performance',
        'documentation',
        'tests',
        'typescript',
        'lint',
        'build',
        'custom',
      ] as const;

      for (const domain of domains) {
        runner.registerGate(makeGate({ id: `gate-${domain}`, domain }));
      }

      const results = await runner.runAll({ score: 100 });
      expect(results).toHaveLength(9);

      for (const domain of domains) {
        const domainResults = await runner.runDomain(domain, { score: 100 });
        expect(domainResults).toHaveLength(1);
        expect(domainResults[0]!.domain).toBe(domain);
      }
    });
  });

  // ─── EventBus Integration ───────────────────────────────

  describe('EventBus integration', () => {
    it('should emit events when a gate is evaluated', async () => {
      const emitMock = vi.fn().mockResolvedValue(0);
      const mockBus = { emit: emitMock } as any;
      const runnerWithBus = new QualityGateRunner(mockBus);

      runnerWithBus.registerGate(makeGate({ id: 'g1', threshold: 70 }));
      await runnerWithBus.runGate('g1', { score: 85 });

      expect(emitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quality.gateEvaluated',
          source: 'quality-gates',
        })
      );
    });

    it('should emit events when a report is generated', () => {
      const emitMock = vi.fn().mockResolvedValue(0);
      const mockBus = { emit: emitMock } as any;
      const runnerWithBus = new QualityGateRunner(mockBus);

      runnerWithBus.generateReport([
        {
          gateId: 'g1',
          domain: 'architecture',
          status: 'passed',
          score: 90,
          threshold: 70,
          message: 'OK',
          timestamp: new Date().toISOString(),
        },
      ]);

      expect(emitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quality.reportGenerated',
          source: 'quality-gates',
        })
      );
    });

    it('should not throw if EventBus emit fails', async () => {
      const failBus = {
        emit: vi.fn().mockRejectedValue(new Error('bus error')),
      } as any;
      const runnerWithBus = new QualityGateRunner(failBus);

      runnerWithBus.registerGate(makeGate({ id: 'g1' }));
      // Should NOT throw
      const result = await runnerWithBus.runGate('g1', { score: 100 });
      expect(result.status).toBe('passed');
    });
  });

  // ─── End-to-End: Full Workflow Validation ───────────────

  describe('end-to-end workflow validation', () => {
    it('should validate a multi-gate workflow and produce a report', async () => {
      // Register gates across domains
      runner.registerGate(
        makeGate({
          id: 'ts-check',
          domain: 'typescript',
          threshold: 80,
          validate: async () => ({
            gateId: 'ts-check',
            domain: 'typescript' as const,
            status: 'passed' as const,
            score: 95,
            threshold: 80,
            message: 'No TypeScript errors',
            timestamp: new Date().toISOString(),
          }),
        })
      );

      runner.registerGate(
        makeGate({
          id: 'lint-check',
          domain: 'lint',
          threshold: 70,
          validate: async () => ({
            gateId: 'lint-check',
            domain: 'lint' as const,
            status: 'passed' as const,
            score: 88,
            threshold: 70,
            message: '3 minor warnings',
            timestamp: new Date().toISOString(),
          }),
        })
      );

      runner.registerGate(
        makeGate({
          id: 'test-check',
          domain: 'tests',
          threshold: 75,
          validate: async () => ({
            gateId: 'test-check',
            domain: 'tests' as const,
            status: 'passed' as const,
            score: 82,
            threshold: 75,
            message: 'Test coverage: 82%',
            timestamp: new Date().toISOString(),
          }),
        })
      );

      runner.registerGate(
        makeGate({
          id: 'sec-check',
          domain: 'security',
          threshold: 90,
          validate: async () => ({
            gateId: 'sec-check',
            domain: 'security' as const,
            status: 'failed' as const,
            score: 65,
            threshold: 90,
            message: '2 high-severity vulnerabilities',
            autoFixSuggestion: 'Update packages X and Y to fix vulnerabilities',
            timestamp: new Date().toISOString(),
          }),
        })
      );

      // Register a composite gate
      runner.registerCompositeGate({
        id: 'build-ready',
        name: 'Build Readiness',
        operator: 'and',
        gateIds: ['ts-check', 'lint-check', 'test-check', 'sec-check'],
      });

      // Run all gates
      const allResults = await runner.runAll({});
      expect(allResults).toHaveLength(4);

      // Generate report
      const report = runner.generateReport(allResults);
      expect(report.overallStatus).toBe('failed'); // Security failed
      expect(report.failedCount).toBe(1);
      expect(report.passedCount).toBe(3);

      // Run composite gate
      const compositeResult = await runner.runComposite('build-ready', {});
      expect(compositeResult.status).toBe('failed'); // AND → all must pass
      expect(compositeResult.details?.subResults).toHaveLength(4);
    });
  });
});
