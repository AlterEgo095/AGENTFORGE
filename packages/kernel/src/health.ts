/**
 * ALTER EGO OS — HealthMonitor Implementation
 *
 * Heartbeat system and health checks for all registered components.
 * Emits events on the EventBus for status changes and heartbeat ticks.
 */

import { EventBus } from '@alterego/event-bus';
import type { HealthMonitor, HealthStatus } from './types.js';

// ─── Implementation ────────────────────────────────────────────

export class HealthMonitorImpl implements HealthMonitor {
  private readonly components: Map<string, () => Promise<HealthStatus>> = new Map();
  private readonly lastStatus: Map<string, HealthStatus> = new Map();
  private readonly eventBus: EventBus;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatRunning = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  register(componentId: string, healthCheck: () => Promise<HealthStatus>): void {
    if (this.components.has(componentId)) {
      throw new Error(`Component "${componentId}" is already registered`);
    }

    this.components.set(componentId, healthCheck);

    this.eventBus.emit({
      type: 'health.component-registered',
      payload: { componentId },
      source: 'kernel.health',
    });
  }

  unregister(componentId: string): void {
    this.components.delete(componentId);
    this.lastStatus.delete(componentId);

    this.eventBus.emit({
      type: 'health.component-unregistered',
      payload: { componentId },
      source: 'kernel.health',
    });
  }

  async checkHealth(componentId: string): Promise<HealthStatus> {
    const check = this.components.get(componentId);
    if (!check) {
      return {
        componentId,
        healthy: false,
        message: `Component "${componentId}" is not registered`,
        timestamp: new Date().toISOString(),
      };
    }

    const startTime = Date.now();
    try {
      const status = await check();
      status.responseTimeMs = Date.now() - startTime;
      status.timestamp = new Date().toISOString();

      // Check if status changed
      const previousStatus = this.lastStatus.get(componentId);
      if (!previousStatus || previousStatus.healthy !== status.healthy) {
        this.eventBus.emit({
          type: 'health.status-changed',
          payload: {
            componentId,
            healthy: status.healthy,
            message: status.message,
          },
          source: 'kernel.health',
        });
      }

      this.lastStatus.set(componentId, status);
      return status;
    } catch (error) {
      const status: HealthStatus = {
        componentId,
        healthy: false,
        message: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startTime,
      };

      const previousStatus = this.lastStatus.get(componentId);
      if (!previousStatus || previousStatus.healthy !== status.healthy) {
        this.eventBus.emit({
          type: 'health.status-changed',
          payload: {
            componentId,
            healthy: false,
            message: status.message,
          },
          source: 'kernel.health',
        });
      }

      this.lastStatus.set(componentId, status);
      return status;
    }
  }

  async checkAll(): Promise<Record<string, HealthStatus>> {
    const results: Record<string, HealthStatus> = {};

    const checkPromises = Array.from(this.components.keys()).map(async (id) => {
      results[id] = await this.checkHealth(id);
    });

    await Promise.allSettled(checkPromises);
    return results;
  }

  startHeartbeat(intervalMs: number = 30_000): void {
    if (this.heartbeatRunning) {
      this.stopHeartbeat();
    }

    this.heartbeatRunning = true;

    this.heartbeatInterval = setInterval(async () => {
      await this.checkAll();

      this.eventBus.emit({
        type: 'health.heartbeat',
        payload: {
          timestamp: new Date().toISOString(),
          components: this.components.size,
        },
        source: 'kernel.health',
      });
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.heartbeatRunning = false;
  }

  isHeartbeatRunning(): boolean {
    return this.heartbeatRunning;
  }

  getRegisteredComponents(): string[] {
    return Array.from(this.components.keys());
  }
}
