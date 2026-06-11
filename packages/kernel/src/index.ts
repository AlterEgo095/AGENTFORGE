/**
 * ALTER EGO OS — Kernel Package
 *
 * The absolute foundation of the Cognitive Personal OS.
 * Provides core infrastructure: config, security, cost tracking, health,
 * logging, metrics, and auth — with no knowledge of any specific agent.
 *
 * All kernel components emit events through the EventBus.
 */

// ─── Types ─────────────────────────────────────────────────────

export type {
  // Config
  ConfigRule,
  ValidationResult,
  ValidationError,
  ConfigManager,
  // Security
  AuthorizationResult,
  SandboxContext,
  RateLimit,
  AuditEntry,
  AuditFilter,
  PermissionRule,
  SecurityGate,
  // Cost Tracker
  TokenUsage,
  BudgetStatus,
  CostBreakdown,
  ModelCost,
  UsageRecord,
  TimePeriod,
  CostTracker,
  // Health Monitor
  HealthStatus,
  HealthMonitor,
  // Logger
  LogLevel,
  LogContext,
  LogEntry,
  LogTransport,
  LoggerConfig,
  Logger,
  // Metrics
  MetricPoint,
  MetricsSnapshot,
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  TimingMetric,
  Metrics,
  // Auth
  AuthContext,
  Auth,
  // Kernel Events
  KernelEventType,
  KernelEventPayloads,
} from './types.js';

// ─── Implementations ───────────────────────────────────────────

export { ConfigManagerImpl } from './config.js';
export { SecurityGateImpl } from './security.js';
export { CostTrackerImpl } from './cost-tracker.js';
export { HealthMonitorImpl } from './health.js';
export { LoggerImpl, ConsoleTransport, InMemoryTransport } from './logger.js';
export { MetricsImpl } from './metrics.js';
export { AuthImpl } from './auth.js';
