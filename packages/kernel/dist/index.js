/**
 * ALTER EGO OS — Kernel Package
 *
 * The absolute foundation of the Cognitive Personal OS.
 * Provides core infrastructure: config, security, cost tracking, health,
 * logging, metrics, and auth — with no knowledge of any specific agent.
 *
 * All kernel components emit events through the EventBus.
 */
// ─── Implementations ───────────────────────────────────────────
export { ConfigManagerImpl } from './config.js';
export { SecurityGateImpl } from './security.js';
export { CostTrackerImpl } from './cost-tracker.js';
export { HealthMonitorImpl } from './health.js';
export { LoggerImpl, ConsoleTransport, InMemoryTransport } from './logger.js';
export { MetricsImpl } from './metrics.js';
export { AuthImpl } from './auth.js';
//# sourceMappingURL=index.js.map