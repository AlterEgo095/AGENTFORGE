/**
 * ALTER EGO OS — HealthMonitor Implementation
 *
 * Heartbeat system and health checks for all registered components.
 * Emits events on the EventBus for status changes and heartbeat ticks.
 */
// ─── Implementation ────────────────────────────────────────────
export class HealthMonitorImpl {
    components = new Map();
    lastStatus = new Map();
    eventBus;
    heartbeatInterval = null;
    heartbeatRunning = false;
    constructor(eventBus) {
        this.eventBus = eventBus;
    }
    register(componentId, healthCheck) {
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
    unregister(componentId) {
        this.components.delete(componentId);
        this.lastStatus.delete(componentId);
        this.eventBus.emit({
            type: 'health.component-unregistered',
            payload: { componentId },
            source: 'kernel.health',
        });
    }
    async checkHealth(componentId) {
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
        }
        catch (error) {
            const status = {
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
    async checkAll() {
        const results = {};
        const checkPromises = Array.from(this.components.keys()).map(async (id) => {
            results[id] = await this.checkHealth(id);
        });
        await Promise.allSettled(checkPromises);
        return results;
    }
    startHeartbeat(intervalMs = 30_000) {
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
    stopHeartbeat() {
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        this.heartbeatRunning = false;
    }
    isHeartbeatRunning() {
        return this.heartbeatRunning;
    }
    getRegisteredComponents() {
        return Array.from(this.components.keys());
    }
}
//# sourceMappingURL=health.js.map