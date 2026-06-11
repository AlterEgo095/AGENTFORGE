/**
 * ALTER EGO OS — Quality Gates Types
 *
 * Core type definitions for the quality gate validation system.
 * Quality Gates validate every step of a workflow across multiple domains.
 */

// ─── Identifier & Status Types ───────────────────────────────

/** Unique identifier for a quality gate */
export type GateId = string;

/** Possible outcomes of a gate evaluation */
export type GateStatus = 'passed' | 'failed' | 'warning' | 'skipped';

/** Domains that quality gates can validate */
export type GateDomain =
  | 'architecture'
  | 'security'
  | 'performance'
  | 'documentation'
  | 'tests'
  | 'typescript'
  | 'lint'
  | 'build'
  | 'custom';

// ─── Gate Result ─────────────────────────────────────────────

/** Result of evaluating a single quality gate */
export interface GateResult {
  /** The gate that produced this result */
  gateId: GateId;
  /** Domain this gate belongs to */
  domain: GateDomain;
  /** Pass / fail / warning / skipped */
  status: GateStatus;
  /** Numeric score 0-100 */
  score: number;
  /** Minimum score required to pass */
  threshold: number;
  /** Human-readable result message */
  message: string;
  /** Additional diagnostic data */
  details?: Record<string, unknown>;
  /** Suggested automatic fix when the gate fails */
  autoFixSuggestion?: string;
  /** ISO 8601 timestamp of evaluation */
  timestamp: string;
}

// ─── Quality Gate ────────────────────────────────────────────

/** A single quality gate definition */
export interface QualityGate {
  /** Unique gate identifier */
  id: GateId;
  /** Domain category */
  domain: GateDomain;
  /** Human-readable name */
  name: string;
  /** Description of what this gate validates */
  description: string;
  /** Minimum score (0-100) to consider the gate passed */
  threshold: number;
  /** The validation function — receives arbitrary input, returns a GateResult */
  validate: (input: unknown) => Promise<GateResult>;
}

// ─── Composite Gate ──────────────────────────────────────────

/** A gate composed of other gates combined with AND / OR logic */
export interface CompositeGate {
  /** Unique composite gate identifier */
  id: GateId;
  /** Human-readable name */
  name: string;
  /** How to combine sub-gate results: all must pass (and) or any must pass (or) */
  operator: 'and' | 'or';
  /** IDs of the sub-gates to combine */
  gateIds: GateId[];
}

// ─── Quality Report ──────────────────────────────────────────

/** Aggregated quality report across many gate evaluations */
export interface QualityReport {
  /** Overall status derived from individual results */
  overallStatus: GateStatus;
  /** Weighted average score 0-100 */
  overallScore: number;
  /** Individual gate results */
  gateResults: GateResult[];
  /** Number of gates that passed */
  passedCount: number;
  /** Number of gates that failed */
  failedCount: number;
  /** Number of gates with warnings */
  warningCount: number;
  /** ISO 8601 timestamp of report generation */
  timestamp: string;
}

// ─── Quality Gate Events ────────────────────────────────────

/** Event emitted when a gate is evaluated */
export interface GateEvaluatedEvent {
  gateId: GateId;
  domain: GateDomain;
  status: GateStatus;
  score: number;
  threshold: number;
}

/** Event emitted when a quality report is generated */
export interface QualityReportEvent {
  overallStatus: GateStatus;
  overallScore: number;
  passedCount: number;
  failedCount: number;
  warningCount: number;
}
