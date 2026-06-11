/**
 * ALTER EGO OS — Quality Gates
 *
 * Public API for the quality gate validation system.
 */

export { QualityGateRunner } from './quality-gates.js';
export type {
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
