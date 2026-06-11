/**
 * ALTER EGO OS — Kernel Types
 *
 * Core type definitions for the Kernel package.
 * The Kernel is the absolute foundation — it provides interfaces that agents use,
 * but it has no knowledge of any specific agent.
 */

// ─── Config Types ──────────────────────────────────────────────

/** Validation rule for a config key */
export interface ConfigRule {
  /** Expected type of the value */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** Whether this config key is required */
  required?: boolean;
  /** Default value if not set */
  default?: unknown;
  /** Minimum value (for number type) */
  min?: number;
  /** Maximum value (for number type) */
  max?: number;
  /** Allowed values (for string type enum) */
  enum?: string[];
  /** Custom validation function */
  validate?: (value: unknown) => boolean;
}

/** Result of config validation */
export interface ValidationResult {
  /** Whether the config is valid */
  valid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
}

/** A single validation error */
export interface ValidationError {
  /** The config key that failed validation */
  key: string;
  /** Human-readable error message */
  message: string;
}

/** ConfigManager — loads and validates configuration from env/files */
export interface ConfigManager {
  get<T>(key: string, defaultValue?: T): T;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  loadFromEnv(): void;
  validate(schema: Record<string, ConfigRule>): ValidationResult;
  getAll(): Record<string, unknown>;
}

// ─── Security Types ────────────────────────────────────────────

/** Result of an authorization check */
export interface AuthorizationResult {
  /** Whether the action is authorized */
  allowed: boolean;
  /** Reason for denial (if not allowed) */
  reason?: string;
  /** Permissions granted */
  permissions?: string[];
}

/** Context for a sandboxed agent */
export interface SandboxContext {
  /** The agent ID this sandbox belongs to */
  agentId: string;
  /** Resources this agent is allowed to access */
  allowedResources: string[];
  /** Actions this agent is allowed to perform */
  allowedActions: string[];
  /** Rate limits for this sandbox */
  rateLimits?: RateLimit[];
  /** Whether the sandbox is active */
  active: boolean;
  /** Timestamp when the sandbox was created */
  createdAt: string;
}

/** Rate limit configuration */
export interface RateLimit {
  /** Name of the rate-limited action */
  action: string;
  /** Maximum number of calls in the window */
  maxCalls: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

/** An entry in the audit log */
export interface AuditEntry {
  /** Unique audit entry ID */
  id: string;
  /** The agent that performed the action */
  agentId: string;
  /** The action that was attempted */
  action: string;
  /** The resource that was accessed */
  resource: string;
  /** Whether the action was allowed */
  allowed: boolean;
  /** Timestamp of the action */
  timestamp: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Reason for denial (if not allowed) */
  reason?: string;
}

/** Filter for querying audit log */
export interface AuditFilter {
  /** Filter by agent ID */
  agentId?: string;
  /** Filter by action */
  action?: string;
  /** Filter by resource */
  resource?: string;
  /** Filter by allowed status */
  allowed?: boolean;
  /** Filter from timestamp */
  from?: string;
  /** Filter to timestamp */
  to?: string;
  /** Maximum number of entries to return */
  limit?: number;
}

/** Permission rule for an agent */
export interface PermissionRule {
  /** The agent ID */
  agentId: string;
  /** Actions this agent is allowed */
  actions: string[];
  /** Resources this agent can access (supports glob patterns) */
  resources: string[];
  /** Priority of this rule (higher = more important) */
  priority?: number;
}

/** SecurityGate — authorization, sandboxing, audit logging */
export interface SecurityGate {
  authorize(agentId: string, action: string, resource: string): AuthorizationResult;
  sandbox(agentId: string): SandboxContext;
  audit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void;
  getAuditLog(filter?: AuditFilter): AuditEntry[];
  addPermissionRule(rule: PermissionRule): void;
  removePermissionRule(agentId: string): void;
  getSandbox(agentId: string): SandboxContext | undefined;
}

// ─── Cost Tracker Types ────────────────────────────────────────

/** Token usage breakdown */
export interface TokenUsage {
  /** Number of prompt tokens */
  promptTokens: number;
  /** Number of completion tokens */
  completionTokens: number;
  /** Total tokens (prompt + completion) */
  totalTokens: number;
}

/** Budget status for a mission */
export interface BudgetStatus {
  /** Mission ID */
  missionId: string;
  /** Maximum budget in USD */
  maxBudgetUsd: number;
  /** Current spend in USD */
  currentSpendUsd: number;
  /** Remaining budget in USD */
  remainingUsd: number;
  /** Percentage of budget used (0-100) */
  percentUsed: number;
  /** Whether the budget has been exceeded */
  exceeded: boolean;
}

/** Cost breakdown */
export interface CostBreakdown {
  /** Total cost in USD */
  totalCostUsd: number;
  /** Total tokens used */
  totalTokens: number;
  /** Breakdown by model */
  byModel: Record<string, ModelCost>;
  /** Breakdown by agent */
  byAgent?: Record<string, number>;
  /** Breakdown by mission */
  byMission?: Record<string, number>;
}

/** Cost for a specific model */
export interface ModelCost {
  /** Model name */
  model: string;
  /** Cost in USD for this model */
  costUsd: number;
  /** Total tokens for this model */
  totalTokens: number;
  /** Number of calls to this model */
  callCount: number;
}

/** A single usage record */
export interface UsageRecord {
  /** Unique record ID */
  id: string;
  /** Agent that used the tokens */
  agentId: string;
  /** Mission the tokens were used for */
  missionId: string;
  /** Model used */
  model: string;
  /** Token usage details */
  tokens: TokenUsage;
  /** Cost in USD */
  costUsd: number;
  /** Timestamp */
  timestamp: string;
}

/** Time period for cost queries */
export interface TimePeriod {
  /** Start of the period */
  from: string;
  /** End of the period */
  to: string;
}

/** CostTracker — token counting, cost tracking per agent/mission */
export interface CostTracker {
  recordUsage(agentId: string, missionId: string, model: string, tokens: TokenUsage, costUsd: number): void;
  getBudget(missionId: string): BudgetStatus;
  getMissionCost(missionId: string): CostBreakdown;
  getAgentCost(agentId: string, period?: TimePeriod): CostBreakdown;
  setBudget(missionId: string, maxBudgetUsd: number): void;
  isBudgetExceeded(missionId: string): boolean;
  getUsageRecords(missionId?: string, agentId?: string): UsageRecord[];
}

// ─── Health Monitor Types ──────────────────────────────────────

/** Health status of a component */
export interface HealthStatus {
  /** Component ID */
  componentId: string;
  /** Whether the component is healthy */
  healthy: boolean;
  /** Human-readable status message */
  message?: string;
  /** Timestamp of the last check */
  timestamp: string;
  /** Response time of the health check in ms */
  responseTimeMs?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** HealthMonitor — heartbeat system, health checks for all registered components */
export interface HealthMonitor {
  register(componentId: string, healthCheck: () => Promise<HealthStatus>): void;
  unregister(componentId: string): void;
  checkHealth(componentId: string): Promise<HealthStatus>;
  checkAll(): Promise<Record<string, HealthStatus>>;
  startHeartbeat(intervalMs?: number): void;
  stopHeartbeat(): void;
  isHeartbeatRunning(): boolean;
  getRegisteredComponents(): string[];
}

// ─── Logger Types ──────────────────────────────────────────────

/** Log levels */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Structured log context */
export type LogContext = Record<string, unknown>;

/** A structured log entry */
export interface LogEntry {
  /** Timestamp of the log entry */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Structured context */
  context?: LogContext;
  /** Error details (if level is error) */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  /** Source module */
  source?: string;
}

/** Log transport — defines where logs are written */
export interface LogTransport {
  /** Unique name for this transport */
  name: string;
  /** Minimum log level for this transport */
  level: LogLevel;
  /** Write a log entry */
  write(entry: LogEntry): void;
}

/** Logger configuration */
export interface LoggerConfig {
  /** Minimum log level (default: 'info') */
  minLevel?: LogLevel;
  /** Source module name */
  source?: string;
  /** Custom transports */
  transports?: LogTransport[];
}

/** Logger — structured logging with levels and transports */
export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): Logger;
  getLevel(): LogLevel;
  setLevel(level: LogLevel): void;
  addTransport(transport: LogTransport): void;
  removeTransport(name: string): void;
}

// ─── Metrics Types ─────────────────────────────────────────────

/** A single metric data point */
export interface MetricPoint {
  /** Metric name */
  name: string;
  /** Metric value */
  value: number;
  /** Labels/tags */
  labels: Record<string, string>;
  /** Timestamp */
  timestamp: string;
  /** Metric type */
  type: 'counter' | 'gauge' | 'histogram' | 'timing';
}

/** Snapshot of all metrics */
export interface MetricsSnapshot {
  /** When the snapshot was taken */
  timestamp: string;
  /** All metric points */
  counters: Record<string, CounterMetric>;
  gauges: Record<string, GaugeMetric>;
  histograms: Record<string, HistogramMetric>;
  timings: Record<string, TimingMetric>;
}

/** Counter metric */
export interface CounterMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
}

/** Gauge metric */
export interface GaugeMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
}

/** Histogram metric */
export interface HistogramMetric {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  buckets: Record<string, number>;
  labels: Record<string, string>;
}

/** Timing metric */
export interface TimingMetric {
  name: string;
  count: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  labels: Record<string, string>;
}

/** Metrics — performance metrics collection and reporting */
export interface Metrics {
  counter(name: string, labels?: Record<string, string>): void;
  gauge(name: string, value: number, labels?: Record<string, string>): void;
  histogram(name: string, value: number, labels?: Record<string, string>): void;
  timing(name: string, durationMs: number, labels?: Record<string, string>): void;
  snapshot(): MetricsSnapshot;
  reset(): void;
}

// ─── Auth Types ────────────────────────────────────────────────

/** Authentication context */
export interface AuthContext {
  /** User or agent ID */
  id: string;
  /** Display name */
  name?: string;
  /** Roles assigned */
  roles: string[];
  /** Permissions granted */
  permissions: string[];
  /** Authentication provider */
  provider: string;
  /** When the auth context was created */
  authenticatedAt: string;
  /** When the auth context expires */
  expiresAt?: string;
  /** Additional claims */
  metadata?: Record<string, unknown>;
}

/** Auth — authentication context management */
export interface Auth {
  /** Set the current auth context */
  setContext(context: AuthContext): void;
  /** Get the current auth context */
  getContext(): AuthContext | undefined;
  /** Clear the current auth context */
  clearContext(): void;
  /** Check if the current context has a specific permission */
  hasPermission(permission: string): boolean;
  /** Check if the current context has a specific role */
  hasRole(role: string): boolean;
  /** Check if the current context is authenticated */
  isAuthenticated(): boolean;
  /** Check if the current context is expired */
  isExpired(): boolean;
}

// ─── Kernel Events ─────────────────────────────────────────────

/** Event types emitted by the kernel */
export type KernelEventType =
  | 'config.changed'
  | 'config.loaded'
  | 'security.audit'
  | 'security.authorization.denied'
  | 'cost.usage-recorded'
  | 'cost.budget-exceeded'
  | 'cost.budget-set'
  | 'health.status-changed'
  | 'health.heartbeat'
  | 'health.component-registered'
  | 'health.component-unregistered';

/** Event payloads for kernel events */
export interface KernelEventPayloads {
  'config.changed': { key: string; oldValue: unknown; newValue: unknown };
  'config.loaded': { source: string; keyCount: number };
  'security.audit': AuditEntry;
  'security.authorization.denied': { agentId: string; action: string; resource: string; reason: string };
  'cost.usage-recorded': UsageRecord;
  'cost.budget-exceeded': { missionId: string; currentSpendUsd: number; maxBudgetUsd: number };
  'cost.budget-set': { missionId: string; maxBudgetUsd: number };
  'health.status-changed': { componentId: string; healthy: boolean; message?: string };
  'health.heartbeat': { timestamp: string; components: number };
  'health.component-registered': { componentId: string };
  'health.component-unregistered': { componentId: string };
}
