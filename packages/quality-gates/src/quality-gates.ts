/**
 * ALTER EGO OS — Quality Gate Runner
 *
 * Registers, evaluates, and composes quality gates across multiple domains.
 * Emits events through the EventBus for observability.
 */

import type { EventBus } from '@alterego/event-bus';
import type {
  GateId,
  GateStatus,
  GateDomain,
  GateResult,
  QualityGate,
  CompositeGate,
  QualityReport,
  GateEvaluatedEvent,
  QualityReportEvent,
} from './types.js';

// ─── Helper: determine GateStatus from score and threshold ───

function computeStatus(score: number, threshold: number): GateStatus {
  if (score >= threshold) return 'passed';
  if (score >= threshold * 0.8) return 'warning';
  return 'failed';
}

// ─── Quality Gate Runner ─────────────────────────────────────

export class QualityGateRunner {
  private readonly gates: Map<GateId, QualityGate> = new Map();
  private readonly compositeGates: Map<GateId, CompositeGate> = new Map();
  private readonly eventBus?: EventBus;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
  }

  // ─── Registration ───────────────────────────────────────

  /**
   * Register a quality gate.
   * Throws if a gate with the same ID already exists.
   */
  registerGate(gate: QualityGate): void {
    if (this.gates.has(gate.id)) {
      throw new Error(`Quality gate already registered: ${gate.id}`);
    }
    this.gates.set(gate.id, gate);
  }

  /**
   * Register a composite gate (AND / OR combination of existing gates).
   * Throws if a composite gate with the same ID already exists.
   * Note: sub-gate IDs are validated at run-time, not registration time,
   * so you can register composites before their sub-gates.
   */
  registerCompositeGate(composite: CompositeGate): void {
    if (this.compositeGates.has(composite.id)) {
      throw new Error(`Composite gate already registered: ${composite.id}`);
    }
    this.compositeGates.set(composite.id, composite);
  }

  // ─── Single Gate Execution ──────────────────────────────

  /**
   * Run a single gate by ID.
   * Throws if the gate is not registered.
   */
  async runGate(gateId: GateId, input: unknown): Promise<GateResult> {
    const gate = this.gates.get(gateId);
    if (!gate) {
      throw new Error(`Quality gate not found: ${gateId}`);
    }

    let result: GateResult;
    try {
      result = await gate.validate(input);
    } catch (error) {
      // If the validator itself throws, produce a failed result
      result = {
        gateId: gate.id,
        domain: gate.domain,
        status: 'failed',
        score: 0,
        threshold: gate.threshold,
        message: `Validator threw an error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Ensure the result score is clamped to 0-100
    result.score = Math.max(0, Math.min(100, result.score));

    // If the validator didn't set status correctly based on threshold, recompute
    if (result.status !== 'skipped') {
      const computed = computeStatus(result.score, result.threshold);
      // Only override if the validator gave a plainly wrong status
      // (e.g. score below threshold but status 'passed')
      if (
        (computed === 'failed' && result.status === 'passed') ||
        (computed === 'passed' && result.status === 'failed')
      ) {
        result.status = computed;
      }
    }

    // Emit event
    this.emitGateEvaluated(result);

    return result;
  }

  // ─── Run All Gates ──────────────────────────────────────

  /**
   * Run every registered gate and return the results.
   */
  async runAll(input: unknown): Promise<GateResult[]> {
    const results: GateResult[] = [];
    for (const gateId of this.gates.keys()) {
      results.push(await this.runGate(gateId, input));
    }
    return results;
  }

  // ─── Run by Domain ──────────────────────────────────────

  /**
   * Run all gates that belong to a specific domain.
   */
  async runDomain(domain: GateDomain, input: unknown): Promise<GateResult[]> {
    const results: GateResult[] = [];
    for (const [gateId, gate] of this.gates) {
      if (gate.domain === domain) {
        results.push(await this.runGate(gateId, input));
      }
    }
    return results;
  }

  // ─── Composite Gate Execution ───────────────────────────

  /**
   * Run a composite gate by ID.
   * AND: all sub-gates must pass for the composite to pass.
   * OR: any sub-gate must pass for the composite to pass.
   */
  async runComposite(compositeId: GateId, input: unknown): Promise<GateResult> {
    const composite = this.compositeGates.get(compositeId);
    if (!composite) {
      throw new Error(`Composite gate not found: ${compositeId}`);
    }

    // Run each sub-gate
    const subResults: GateResult[] = [];
    for (const gateId of composite.gateIds) {
      const result = await this.runGate(gateId, input);
      subResults.push(result);
    }

    // Compute composite status
    const passCount = subResults.filter((r) => r.status === 'passed').length;
    const warnCount = subResults.filter((r) => r.status === 'warning').length;
    const failCount = subResults.filter((r) => r.status === 'failed').length;

    let compositeStatus: GateStatus;
    if (composite.operator === 'and') {
      if (failCount > 0) {
        compositeStatus = 'failed';
      } else if (warnCount > 0) {
        compositeStatus = 'warning';
      } else {
        compositeStatus = 'passed';
      }
    } else {
      // OR
      if (passCount > 0) {
        compositeStatus = 'passed';
      } else if (warnCount > 0) {
        compositeStatus = 'warning';
      } else {
        compositeStatus = 'failed';
      }
    }

    // Compute average score
    const avgScore =
      subResults.length > 0
        ? Math.round(subResults.reduce((sum, r) => sum + r.score, 0) / subResults.length)
        : 0;

    // Compute threshold as max of sub-gates (hardest to pass)
    const effectiveThreshold =
      subResults.length > 0
        ? Math.max(...subResults.map((r) => r.threshold))
        : 0;

    const result: GateResult = {
      gateId: composite.id,
      domain: 'custom',
      status: compositeStatus,
      score: avgScore,
      threshold: effectiveThreshold,
      message: `Composite gate "${composite.name}" (${composite.operator.toUpperCase()}): ${passCount} passed, ${warnCount} warnings, ${failCount} failed`,
      details: {
        operator: composite.operator,
        subGateIds: composite.gateIds,
        subResults: subResults.map((r) => ({
          gateId: r.gateId,
          status: r.status,
          score: r.score,
        })),
      },
      timestamp: new Date().toISOString(),
    };

    this.emitGateEvaluated(result);
    return result;
  }

  // ─── Report Generation ──────────────────────────────────

  /**
   * Generate a quality report from a set of gate results.
   */
  generateReport(results: GateResult[]): QualityReport {
    const passedCount = results.filter((r) => r.status === 'passed').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;
    const warningCount = results.filter((r) => r.status === 'warning').length;

    // Overall score is the average of individual scores
    const overallScore =
      results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
        : 0;

    // Overall status: any failure → failed, any warning → warning, else passed
    let overallStatus: GateStatus;
    if (failedCount > 0) {
      overallStatus = 'failed';
    } else if (warningCount > 0) {
      overallStatus = 'warning';
    } else if (results.length === 0) {
      overallStatus = 'skipped';
    } else {
      overallStatus = 'passed';
    }

    const report: QualityReport = {
      overallStatus,
      overallScore,
      gateResults: results,
      passedCount,
      failedCount,
      warningCount,
      timestamp: new Date().toISOString(),
    };

    // Emit report event
    if (this.eventBus) {
      this.eventBus.emit({
        type: 'quality.reportGenerated',
        payload: {
          overallStatus,
          overallScore,
          passedCount,
          failedCount,
          warningCount,
        } satisfies QualityReportEvent,
        source: 'quality-gates',
      }).catch(() => {
        // Swallow event bus errors — reporting is a side-effect
      });
    }

    return report;
  }

  // ─── Accessors ──────────────────────────────────────────

  /** Get a registered gate by ID */
  getGate(gateId: GateId): QualityGate | undefined {
    return this.gates.get(gateId);
  }

  /** Get a registered composite gate by ID */
  getCompositeGate(compositeId: GateId): CompositeGate | undefined {
    return this.compositeGates.get(compositeId);
  }

  /** List all registered gate IDs */
  listGates(): GateId[] {
    return Array.from(this.gates.keys());
  }

  /** List all registered composite gate IDs */
  listCompositeGates(): GateId[] {
    return Array.from(this.compositeGates.keys());
  }

  /** Remove a gate by ID */
  removeGate(gateId: GateId): boolean {
    return this.gates.delete(gateId);
  }

  /** Remove a composite gate by ID */
  removeCompositeGate(compositeId: GateId): boolean {
    return this.compositeGates.delete(compositeId);
  }

  // ─── Private ────────────────────────────────────────────

  private emitGateEvaluated(result: GateResult): void {
    if (this.eventBus) {
      this.eventBus
        .emit({
          type: 'quality.gateEvaluated',
          payload: {
            gateId: result.gateId,
            domain: result.domain,
            status: result.status,
            score: result.score,
            threshold: result.threshold,
          } satisfies GateEvaluatedEvent,
          source: 'quality-gates',
        })
        .catch(() => {
          // Swallow event bus errors
        });
    }
  }
}
