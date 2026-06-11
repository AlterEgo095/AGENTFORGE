/**
 * ALTER EGO OS — HealthMonitor Implementation
 *
 * Heartbeat system and health checks for all registered components.
 * Emits events on the EventBus for status changes and heartbeat ticks.
 */
import { EventBus } from '@alterego/event-bus';
import type { HealthMonitor, HealthStatus } from './types.js';
export declare class HealthMonitorImpl implements HealthMonitor {
    private readonly components;
    private readonly lastStatus;
    private readonly eventBus;
    private heartbeatInterval;
    private heartbeatRunning;
    constructor(eventBus: EventBus);
    register(componentId: string, healthCheck: () => Promise<HealthStatus>): void;
    unregister(componentId: string): void;
    checkHealth(componentId: string): Promise<HealthStatus>;
    checkAll(): Promise<Record<string, HealthStatus>>;
    startHeartbeat(intervalMs?: number): void;
    stopHeartbeat(): void;
    isHeartbeatRunning(): boolean;
    getRegisteredComponents(): string[];
}
//# sourceMappingURL=health.d.ts.map