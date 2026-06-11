/**
 * ALTER EGO OS — Reflection Engine
 *
 * Public API for the strategy comparison and fusion system.
 * The Reflection Engine ensures the system NEVER accepts the first solution.
 */

export { ReflectionEngine } from './reflection-engine.js';

export type {
  StrategyId,
  Strategy,
  EvaluationCriteria,
  EvaluationResult,
  ReflectionResult,
  ReflectionEventType,
  ReflectionEventPayloads,
  ReflectionConfig,
} from './types.js';
