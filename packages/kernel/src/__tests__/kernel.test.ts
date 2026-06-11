/**
 * ALTER EGO OS — Kernel Package Tests
 *
 * Comprehensive tests for all kernel components.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus, resetEventBus } from '@alterego/event-bus';
import {
  ConfigManagerImpl,
  SecurityGateImpl,
  CostTrackerImpl,
  HealthMonitorImpl,
  LoggerImpl,
  InMemoryTransport,
  MetricsImpl,
  AuthImpl,
} from '../index.js';

// ─── Test Helpers ──────────────────────────────────────────────

function createEventBus(): EventBus {
  resetEventBus();
  return new EventBus();
}

// ─── ConfigManager Tests ───────────────────────────────────────

describe('ConfigManager', () => {
  let eventBus: EventBus;
  let config: ConfigManagerImpl;

  beforeEach(() => {
    eventBus = createEventBus();
    config = new ConfigManagerImpl(eventBus);
  });

  describe('get / set / has', () => {
    it('should set and get a value', () => {
      config.set('key', 'value');
      expect(config.get('key')).toBe('value');
    });

    it('should return default value if key not set', () => {
      expect(config.get('missing', 'default')).toBe('default');
    });

    it('should throw if key not found and no default', () => {
      expect(() => config.get('missing')).toThrow('Config key "missing" not found');
    });

    it('should report has correctly', () => {
      expect(config.has('key')).toBe(false);
      config.set('key', 'value');
      expect(config.has('key')).toBe(true);
    });

    it('should handle different value types', () => {
      config.set('str', 'hello');
      config.set('num', 42);
      config.set('bool', true);
      config.set('obj', { a: 1 });
      config.set('arr', [1, 2, 3]);

      expect(config.get<string>('str')).toBe('hello');
      expect(config.get<number>('num')).toBe(42);
      expect(config.get<boolean>('bool')).toBe(true);
      expect(config.get<{ a: number }>('obj')).toEqual({ a: 1 });
      expect(config.get<number[]>('arr')).toEqual([1, 2, 3]);
    });
  });

  describe('delete', () => {
    it('should delete a key', () => {
      config.set('key', 'value');
      expect(config.delete('key')).toBe(true);
      expect(config.has('key')).toBe(false);
    });

    it('should return false for non-existent key', () => {
      expect(config.delete('nonexistent')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all config as an object', () => {
      config.set('a', 1);
      config.set('b', 2);
      const all = config.getAll();
      expect(all).toEqual({ a: 1, b: 2 });
    });
  });

  describe('loadFromEnv', () => {
    it('should load ALTEREGO_ prefixed env vars', () => {
      process.env.ALTEREGO_APP_NAME = '"TestApp"';
      process.env.ALTEREGO_DEBUG = 'true';
      process.env.ALTEREGO_PORT = '3000';

      config.loadFromEnv();

      expect(config.get<string>('app.name')).toBe('TestApp');
      expect(config.get<boolean>('debug')).toBe(true);
      expect(config.get<number>('port')).toBe(3000);

      delete process.env.ALTEREGO_APP_NAME;
      delete process.env.ALTEREGO_DEBUG;
      delete process.env.ALTEREGO_PORT;
    });

    it('should emit config.loaded event', async () => {
      const handler = vi.fn();
      eventBus.subscribe('config.loaded', handler);

      process.env.ALTEREGO_TEST_KEY = '"test_value"';
      config.loadFromEnv();
      delete process.env.ALTEREGO_TEST_KEY;

      // Allow async event processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0]![0].payload as { source: string; keyCount: number };
      expect(payload.source).toBe('env');
      expect(payload.keyCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validate', () => {
    it('should validate required fields', () => {
      const result = config.validate({
        apiKey: { type: 'string', required: true },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.key).toBe('apiKey');
    });

    it('should pass validation with all required fields', () => {
      config.set('apiKey', 'abc123');
      const result = config.validate({
        apiKey: { type: 'string', required: true },
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate types', () => {
      config.set('port', 'not-a-number');
      const result = config.validate({
        port: { type: 'number' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('expected type "number"');
    });

    it('should use default values for missing fields', () => {
      const result = config.validate({
        timeout: { type: 'number', required: true, default: 5000 },
      });
      expect(result.valid).toBe(true);
      expect(config.get<number>('timeout')).toBe(5000);
    });

    it('should validate min/max for numbers', () => {
      config.set('port', 80);
      const result = config.validate({
        port: { type: 'number', min: 1024, max: 65535 },
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('less than minimum');
    });

    it('should validate enum values', () => {
      config.set('logLevel', 'verbose');
      const result = config.validate({
        logLevel: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('not one of');
    });

    it('should run custom validation', () => {
      config.set('email', 'not-an-email');
      const result = config.validate({
        email: {
          type: 'string',
          validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v as string),
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('failed custom validation');
    });
  });

  describe('events', () => {
    it('should emit config.changed event on set', async () => {
      const handler = vi.fn();
      eventBus.subscribe('config.changed', handler);

      config.set('key', 'value');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0]![0].payload as { key: string; oldValue: unknown; newValue: unknown };
      expect(payload.key).toBe('key');
      expect(payload.oldValue).toBeUndefined();
      expect(payload.newValue).toBe('value');
    });

    it('should not emit config.changed event when value is same', async () => {
      const handler = vi.fn();
      eventBus.subscribe('config.changed', handler);

      config.set('key', 'value');
      config.set('key', 'value'); // same value

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledTimes(1); // only once
    });
  });
});

// ─── SecurityGate Tests ────────────────────────────────────────

describe('SecurityGate', () => {
  let eventBus: EventBus;
  let security: SecurityGateImpl;

  beforeEach(() => {
    eventBus = createEventBus();
    security = new SecurityGateImpl(eventBus);
  });

  describe('authorize', () => {
    it('should deny access when no rules exist for agent', () => {
      const result = security.authorize('agent-1', 'read', 'data');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No permission rules');
    });

    it('should allow access when rules match', () => {
      security.addPermissionRule({
        agentId: 'agent-1',
        actions: ['read', 'write'],
        resources: ['data.*'],
      });

      const result = security.authorize('agent-1', 'read', 'data.users');
      expect(result.allowed).toBe(true);
    });

    it('should deny when action not in allowed list', () => {
      security.addPermissionRule({
        agentId: 'agent-1',
        actions: ['read'],
        resources: ['data.*'],
      });

      const result = security.authorize('agent-1', 'delete', 'data.users');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    it('should deny when resource not accessible', () => {
      security.addPermissionRule({
        agentId: 'agent-1',
        actions: ['read'],
        resources: ['public.*'],
      });

      const result = security.authorize('agent-1', 'read', 'private.data');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not accessible');
    });

    it('should support wildcard "*" for actions', () => {
      security.addPermissionRule({
        agentId: 'admin',
        actions: ['*'],
        resources: ['*'],
      });

      expect(security.authorize('admin', 'anything', 'anywhere').allowed).toBe(true);
    });

    it('should support glob patterns for resources', () => {
      security.addPermissionRule({
        agentId: 'agent-1',
        actions: ['read'],
        resources: ['data.*'],
      });

      expect(security.authorize('agent-1', 'read', 'data.users').allowed).toBe(true);
      expect(security.authorize('agent-1', 'read', 'data.posts').allowed).toBe(true);
      expect(security.authorize('agent-1', 'read', 'meta.info').allowed).toBe(false);
    });
  });

  describe('sandbox', () => {
    it('should create a sandbox for an agent', () => {
      security.addPermissionRule({
        agentId: 'agent-1',
        actions: ['read'],
        resources: ['data.*'],
      });

      const sandbox = security.sandbox('agent-1');
      expect(sandbox.agentId).toBe('agent-1');
      expect(sandbox.allowedActions).toEqual(['read']);
      expect(sandbox.allowedResources).toEqual(['data.*']);
      expect(sandbox.active).toBe(true);
    });

    it('should return existing sandbox on second call', () => {
      security.addPermissionRule({
        agentId: 'agent-1',
        actions: ['read'],
        resources: ['data.*'],
      });

      const sandbox1 = security.sandbox('agent-1');
      const sandbox2 = security.sandbox('agent-1');
      expect(sandbox1).toBe(sandbox2);
    });

    it('should return empty sandbox for unknown agent', () => {
      const sandbox = security.sandbox('unknown');
      expect(sandbox.allowedActions).toEqual([]);
      expect(sandbox.allowedResources).toEqual([]);
    });
  });

  describe('audit', () => {
    it('should record audit entries', () => {
      security.audit({
        agentId: 'agent-1',
        action: 'read',
        resource: 'data.users',
        allowed: true,
        metadata: {},
      });

      const log = security.getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.agentId).toBe('agent-1');
      expect(log[0]!.allowed).toBe(true);
      expect(log[0]!.id).toBeTruthy();
      expect(log[0]!.timestamp).toBeTruthy();
    });

    it('should filter audit log by agentId', () => {
      security.audit({ agentId: 'agent-1', action: 'read', resource: 'data', allowed: true, metadata: {} });
      security.audit({ agentId: 'agent-2', action: 'write', resource: 'data', allowed: false, metadata: {} });

      const filtered = security.getAuditLog({ agentId: 'agent-1' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.agentId).toBe('agent-1');
    });

    it('should filter audit log by allowed status', () => {
      security.audit({ agentId: 'agent-1', action: 'read', resource: 'data', allowed: true, metadata: {} });
      security.audit({ agentId: 'agent-1', action: 'write', resource: 'data', allowed: false, metadata: {} });

      const denied = security.getAuditLog({ allowed: false });
      expect(denied).toHaveLength(1);
      expect(denied[0]!.allowed).toBe(false);
    });

    it('should filter audit log by date range', () => {
      security.audit({ agentId: 'agent-1', action: 'read', resource: 'data', allowed: true, metadata: {} });

      const from = new Date(Date.now() - 60000).toISOString();
      const to = new Date(Date.now() + 60000).toISOString();
      const filtered = security.getAuditLog({ from, to });
      expect(filtered).toHaveLength(1);

      const futureFrom = new Date(Date.now() + 60000).toISOString();
      const empty = security.getAuditLog({ from: futureFrom });
      expect(empty).toHaveLength(0);
    });

    it('should limit audit log results', () => {
      for (let i = 0; i < 10; i++) {
        security.audit({ agentId: `agent-${i}`, action: 'read', resource: 'data', allowed: true, metadata: {} });
      }

      const limited = security.getAuditLog({ limit: 3 });
      expect(limited).toHaveLength(3);
    });
  });

  describe('permission rules', () => {
    it('should add and remove permission rules', () => {
      security.addPermissionRule({
        agentId: 'agent-1',
        actions: ['read'],
        resources: ['data.*'],
      });

      expect(security.authorize('agent-1', 'read', 'data.x').allowed).toBe(true);

      security.removePermissionRule('agent-1');
      expect(security.authorize('agent-1', 'read', 'data.x').allowed).toBe(false);
    });

    it('should update sandbox when permission rules change', () => {
      security.addPermissionRule({
        agentId: 'agent-1',
        actions: ['read'],
        resources: ['data.*'],
      });

      security.sandbox('agent-1');

      security.addPermissionRule({
        agentId: 'agent-1',
        actions: ['read', 'write'],
        resources: ['data.*', 'meta.*'],
      });

      const sandbox = security.getSandbox('agent-1');
      expect(sandbox?.allowedActions).toEqual(['read', 'write']);
    });
  });

  describe('events', () => {
    it('should emit security.audit event', async () => {
      const handler = vi.fn();
      eventBus.subscribe('security.audit', handler);

      security.audit({
        agentId: 'agent-1',
        action: 'read',
        resource: 'data',
        allowed: true,
        metadata: {},
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit security.authorization.denied event', async () => {
      const handler = vi.fn();
      eventBus.subscribe('security.authorization.denied', handler);

      security.authorize('unknown', 'read', 'data');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── CostTracker Tests ─────────────────────────────────────────

describe('CostTracker', () => {
  let eventBus: EventBus;
  let costTracker: CostTrackerImpl;

  beforeEach(() => {
    eventBus = createEventBus();
    costTracker = new CostTrackerImpl(eventBus);
  });

  describe('recordUsage', () => {
    it('should record token usage', () => {
      costTracker.recordUsage('agent-1', 'mission-1', 'gpt-4', {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      }, 0.015);

      const records = costTracker.getUsageRecords();
      expect(records).toHaveLength(1);
      expect(records[0]!.agentId).toBe('agent-1');
      expect(records[0]!.missionId).toBe('mission-1');
      expect(records[0]!.model).toBe('gpt-4');
      expect(records[0]!.costUsd).toBe(0.015);
    });

    it('should emit cost.usage-recorded event', async () => {
      const handler = vi.fn();
      eventBus.subscribe('cost.usage-recorded', handler);

      costTracker.recordUsage('agent-1', 'mission-1', 'gpt-4', {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      }, 0.015);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('budget management', () => {
    it('should set and get budget', () => {
      costTracker.setBudget('mission-1', 10.0);

      const budget = costTracker.getBudget('mission-1');
      expect(budget.missionId).toBe('mission-1');
      expect(budget.maxBudgetUsd).toBe(10.0);
      expect(budget.currentSpendUsd).toBe(0);
      expect(budget.remainingUsd).toBe(10.0);
      expect(budget.percentUsed).toBe(0);
      expect(budget.exceeded).toBe(false);
    });

    it('should track spending against budget', () => {
      costTracker.setBudget('mission-1', 1.0);
      costTracker.recordUsage('agent-1', 'mission-1', 'gpt-4', {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      }, 0.5);

      const budget = costTracker.getBudget('mission-1');
      expect(budget.currentSpendUsd).toBe(0.5);
      expect(budget.remainingUsd).toBe(0.5);
      expect(budget.percentUsed).toBe(50);
    });

    it('should detect budget exceeded', () => {
      costTracker.setBudget('mission-1', 1.0);
      costTracker.recordUsage('agent-1', 'mission-1', 'gpt-4', {
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
      }, 1.5);

      expect(costTracker.isBudgetExceeded('mission-1')).toBe(true);

      const budget = costTracker.getBudget('mission-1');
      expect(budget.exceeded).toBe(true);
    });

    it('should emit cost.budget-exceeded event', async () => {
      const handler = vi.fn();
      eventBus.subscribe('cost.budget-exceeded', handler);

      costTracker.setBudget('mission-1', 0.5);
      costTracker.recordUsage('agent-1', 'mission-1', 'gpt-4', {
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
      }, 1.0);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit cost.budget-set event', async () => {
      const handler = vi.fn();
      eventBus.subscribe('cost.budget-set', handler);

      costTracker.setBudget('mission-1', 10.0);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return false for isBudgetExceeded when no budget set', () => {
      expect(costTracker.isBudgetExceeded('unknown-mission')).toBe(false);
    });
  });

  describe('cost breakdowns', () => {
    it('should get mission cost breakdown', () => {
      costTracker.recordUsage('agent-1', 'mission-1', 'gpt-4', {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      }, 0.05);

      costTracker.recordUsage('agent-2', 'mission-1', 'gpt-3.5', {
        promptTokens: 500,
        completionTokens: 200,
        totalTokens: 700,
      }, 0.01);

      const breakdown = costTracker.getMissionCost('mission-1');
      expect(breakdown.totalCostUsd).toBeCloseTo(0.06, 4);
      expect(breakdown.totalTokens).toBe(2200);
      expect(Object.keys(breakdown.byModel)).toHaveLength(2);
      expect(breakdown.byModel['gpt-4']!.costUsd).toBe(0.05);
      expect(breakdown.byModel['gpt-3.5']!.costUsd).toBe(0.01);
    });

    it('should get agent cost breakdown', () => {
      costTracker.recordUsage('agent-1', 'mission-1', 'gpt-4', {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      }, 0.05);

      costTracker.recordUsage('agent-1', 'mission-2', 'gpt-4', {
        promptTokens: 500,
        completionTokens: 250,
        totalTokens: 750,
      }, 0.025);

      const breakdown = costTracker.getAgentCost('agent-1');
      expect(breakdown.totalCostUsd).toBeCloseTo(0.075, 4);
    });

    it('should filter agent cost by time period', () => {
      const now = Date.now();
      costTracker.recordUsage('agent-1', 'mission-1', 'gpt-4', {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      }, 0.05);

      // Future period — should return empty
      const futureBreakdown = costTracker.getAgentCost('agent-1', {
        from: new Date(now + 60000).toISOString(),
        to: new Date(now + 120000).toISOString(),
      });
      expect(futureBreakdown.totalCostUsd).toBe(0);

      // Past period — should include the record
      const pastBreakdown = costTracker.getAgentCost('agent-1', {
        from: new Date(now - 60000).toISOString(),
        to: new Date(now + 60000).toISOString(),
      });
      expect(pastBreakdown.totalCostUsd).toBe(0.05);
    });
  });

  describe('usage records', () => {
    it('should filter records by mission', () => {
      costTracker.recordUsage('agent-1', 'mission-1', 'gpt-4', {
        promptTokens: 100, completionTokens: 50, totalTokens: 150,
      }, 0.01);
      costTracker.recordUsage('agent-1', 'mission-2', 'gpt-4', {
        promptTokens: 200, completionTokens: 100, totalTokens: 300,
      }, 0.02);

      const records = costTracker.getUsageRecords('mission-1');
      expect(records).toHaveLength(1);
      expect(records[0]!.missionId).toBe('mission-1');
    });

    it('should filter records by agent', () => {
      costTracker.recordUsage('agent-1', 'mission-1', 'gpt-4', {
        promptTokens: 100, completionTokens: 50, totalTokens: 150,
      }, 0.01);
      costTracker.recordUsage('agent-2', 'mission-1', 'gpt-4', {
        promptTokens: 200, completionTokens: 100, totalTokens: 300,
      }, 0.02);

      const records = costTracker.getUsageRecords(undefined, 'agent-2');
      expect(records).toHaveLength(1);
      expect(records[0]!.agentId).toBe('agent-2');
    });
  });
});

// ─── HealthMonitor Tests ───────────────────────────────────────

describe('HealthMonitor', () => {
  let eventBus: EventBus;
  let health: HealthMonitorImpl;

  beforeEach(() => {
    eventBus = createEventBus();
    health = new HealthMonitorImpl(eventBus);
  });

  afterEach(() => {
    health.stopHeartbeat();
  });

  describe('register / unregister', () => {
    it('should register a component', () => {
      health.register('db', async () => ({
        componentId: 'db',
        healthy: true,
        timestamp: new Date().toISOString(),
      }));

      expect(health.getRegisteredComponents()).toContain('db');
    });

    it('should throw if component already registered', () => {
      health.register('db', async () => ({
        componentId: 'db',
        healthy: true,
        timestamp: new Date().toISOString(),
      }));

      expect(() =>
        health.register('db', async () => ({
          componentId: 'db',
          healthy: true,
          timestamp: new Date().toISOString(),
        }))
      ).toThrow('already registered');
    });

    it('should unregister a component', () => {
      health.register('db', async () => ({
        componentId: 'db',
        healthy: true,
        timestamp: new Date().toISOString(),
      }));

      health.unregister('db');
      expect(health.getRegisteredComponents()).not.toContain('db');
    });

    it('should emit health.component-registered event', async () => {
      const handler = vi.fn();
      eventBus.subscribe('health.component-registered', handler);

      health.register('db', async () => ({
        componentId: 'db',
        healthy: true,
        timestamp: new Date().toISOString(),
      }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status for a healthy component', async () => {
      health.register('db', async () => ({
        componentId: 'db',
        healthy: true,
        message: 'All good',
        timestamp: new Date().toISOString(),
      }));

      const status = await health.checkHealth('db');
      expect(status.healthy).toBe(true);
      expect(status.message).toBe('All good');
      expect(status.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status for an unhealthy component', async () => {
      health.register('failing', async () => ({
        componentId: 'failing',
        healthy: false,
        message: 'Connection refused',
        timestamp: new Date().toISOString(),
      }));

      const status = await health.checkHealth('failing');
      expect(status.healthy).toBe(false);
      expect(status.message).toBe('Connection refused');
    });

    it('should handle health check that throws', async () => {
      health.register('error', async () => {
        throw new Error('Something broke');
      });

      const status = await health.checkHealth('error');
      expect(status.healthy).toBe(false);
      expect(status.message).toContain('Something broke');
    });

    it('should return not-registered status for unknown component', async () => {
      const status = await health.checkHealth('unknown');
      expect(status.healthy).toBe(false);
      expect(status.message).toContain('not registered');
    });

    it('should emit health.status-changed event when status changes', async () => {
      let callCount = 0;
      const handler = vi.fn();
      eventBus.subscribe('health.status-changed', handler);

      health.register('flaky', async () => ({
        componentId: 'flaky',
        healthy: callCount++ === 0,
        timestamp: new Date().toISOString(),
      }));

      await health.checkHealth('flaky'); // healthy
      await health.checkHealth('flaky'); // unhealthy — status changed

      await new Promise((resolve) => setTimeout(resolve, 10));

      // First check emits (no previous status), second check emits (status changed)
      expect(handler.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('checkAll', () => {
    it('should check health of all registered components', async () => {
      health.register('db', async () => ({
        componentId: 'db',
        healthy: true,
        timestamp: new Date().toISOString(),
      }));

      health.register('cache', async () => ({
        componentId: 'cache',
        healthy: true,
        timestamp: new Date().toISOString(),
      }));

      const results = await health.checkAll();
      expect(Object.keys(results)).toHaveLength(2);
      expect(results['db']!.healthy).toBe(true);
      expect(results['cache']!.healthy).toBe(true);
    });

    it('should handle mixed healthy/unhealthy components', async () => {
      health.register('db', async () => ({
        componentId: 'db',
        healthy: true,
        timestamp: new Date().toISOString(),
      }));

      health.register('failing', async () => ({
        componentId: 'failing',
        healthy: false,
        message: 'Down',
        timestamp: new Date().toISOString(),
      }));

      const results = await health.checkAll();
      expect(results['db']!.healthy).toBe(true);
      expect(results['failing']!.healthy).toBe(false);
    });
  });

  describe('heartbeat', () => {
    it('should start and stop heartbeat', () => {
      expect(health.isHeartbeatRunning()).toBe(false);

      health.register('db', async () => ({
        componentId: 'db',
        healthy: true,
        timestamp: new Date().toISOString(),
      }));

      health.startHeartbeat(100);
      expect(health.isHeartbeatRunning()).toBe(true);

      health.stopHeartbeat();
      expect(health.isHeartbeatRunning()).toBe(false);
    });

    it('should emit heartbeat events', async () => {
      const handler = vi.fn();
      eventBus.subscribe('health.heartbeat', handler);

      health.register('db', async () => ({
        componentId: 'db',
        healthy: true,
        timestamp: new Date().toISOString(),
      }));

      health.startHeartbeat(50);

      await new Promise((resolve) => setTimeout(resolve, 150));

      health.stopHeartbeat();

      expect(handler.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should restart heartbeat if already running', () => {
      health.register('db', async () => ({
        componentId: 'db',
        healthy: true,
        timestamp: new Date().toISOString(),
      }));

      health.startHeartbeat(100);
      health.startHeartbeat(200); // Should restart

      expect(health.isHeartbeatRunning()).toBe(true);
      health.stopHeartbeat();
    });
  });
});

// ─── Logger Tests ──────────────────────────────────────────────

describe('Logger', () => {
  let logger: LoggerImpl;
  let transport: InMemoryTransport;

  beforeEach(() => {
    transport = new InMemoryTransport('debug');
    logger = new LoggerImpl({
      minLevel: 'debug',
      transports: [transport],
    });
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      logger.debug('debug message');
      expect(transport.entries).toHaveLength(1);
      expect(transport.entries[0]!.level).toBe('debug');
    });

    it('should log info messages', () => {
      logger.info('info message');
      expect(transport.entries).toHaveLength(1);
      expect(transport.entries[0]!.level).toBe('info');
    });

    it('should log warn messages', () => {
      logger.warn('warn message');
      expect(transport.entries).toHaveLength(1);
      expect(transport.entries[0]!.level).toBe('warn');
    });

    it('should log error messages', () => {
      logger.error('error message', new Error('test'));
      expect(transport.entries).toHaveLength(1);
      expect(transport.entries[0]!.level).toBe('error');
      expect(transport.entries[0]!.error).toBeDefined();
      expect(transport.entries[0]!.error!.message).toBe('test');
    });

    it('should respect minimum log level', () => {
      const warnTransport = new InMemoryTransport('warn');
      const warnLogger = new LoggerImpl({
        minLevel: 'warn',
        transports: [warnTransport],
      });

      warnLogger.debug('should be filtered');
      warnLogger.info('should be filtered');
      warnLogger.warn('should pass');
      warnLogger.error('should pass');

      expect(warnTransport.entries).toHaveLength(2);
    });
  });

  describe('structured context', () => {
    it('should include context in log entries', () => {
      logger.info('test message', { userId: '123', action: 'login' });
      expect(transport.entries[0]!.context).toEqual({
        userId: '123',
        action: 'login',
      });
    });

    it('should produce valid JSON log entries', () => {
      logger.info('json test', { key: 'value' });
      const entry = transport.entries[0]!;
      const json = JSON.stringify(entry);
      const parsed = JSON.parse(json);
      expect(parsed.message).toBe('json test');
    });
  });

  describe('child logger', () => {
    it('should create child logger with merged context', () => {
      const childLogger = logger.child({ service: 'auth' });
      childLogger.info('child message');

      expect(transport.entries).toHaveLength(1);
      expect(transport.entries[0]!.context).toEqual({ service: 'auth' });
    });

    it('should merge parent and child context', () => {
      const parentWithCtx = new LoggerImpl({
        minLevel: 'debug',
        transports: [transport],
      });
      // Use child to set base context
      const child = parentWithCtx.child({ service: 'auth' });
      child.info('child message', { userId: '123' });

      expect(transport.entries[0]!.context).toEqual({
        service: 'auth',
        userId: '123',
      });
    });
  });

  describe('getLevel / setLevel', () => {
    it('should get current log level', () => {
      expect(logger.getLevel()).toBe('debug');
    });

    it('should set log level', () => {
      logger.setLevel('warn');
      expect(logger.getLevel()).toBe('warn');
    });
  });

  describe('transports', () => {
    it('should add and remove transports', () => {
      const customTransport = new InMemoryTransport('debug');
      customTransport.name = 'custom';
      logger.addTransport(customTransport);

      logger.info('test');
      expect(customTransport.entries).toHaveLength(1);

      logger.removeTransport('custom');
      logger.info('test2');
      expect(customTransport.entries).toHaveLength(1); // no longer receives after removal
    });

    it('should still write to remaining transports after one is removed', () => {
      const customTransport = new InMemoryTransport('debug');
      customTransport.name = 'custom';
      logger.addTransport(customTransport);

      logger.info('test');
      expect(transport.entries).toHaveLength(1);
      expect(customTransport.entries).toHaveLength(1);

      logger.removeTransport('custom');
      logger.info('test2');
      expect(transport.entries).toHaveLength(2); // original transport still receives
      expect(customTransport.entries).toHaveLength(1); // removed transport does not
    });
  });

  describe('error handling', () => {
    it('should log error with stack trace', () => {
      const error = new Error('test error');
      logger.error('something failed', error);

      expect(transport.entries[0]!.error).toBeDefined();
      expect(transport.entries[0]!.error!.name).toBe('Error');
      expect(transport.entries[0]!.error!.message).toBe('test error');
      expect(transport.entries[0]!.error!.stack).toBeDefined();
    });

    it('should log error without Error object', () => {
      logger.error('generic error');

      expect(transport.entries[0]!.error).toBeUndefined();
    });
  });
});

// ─── Metrics Tests ─────────────────────────────────────────────

describe('Metrics', () => {
  let metrics: MetricsImpl;

  beforeEach(() => {
    metrics = new MetricsImpl();
  });

  describe('counter', () => {
    it('should increment a counter', () => {
      metrics.counter('requests');
      metrics.counter('requests');

      const snapshot = metrics.snapshot();
      const counter = Object.values(snapshot.counters)[0];
      expect(counter).toBeDefined();
      expect(counter!.value).toBe(2);
    });

    it('should create separate counters for different labels', () => {
      metrics.counter('requests', { method: 'GET' });
      metrics.counter('requests', { method: 'POST' });

      const snapshot = metrics.snapshot();
      expect(Object.keys(snapshot.counters)).toHaveLength(2);
    });
  });

  describe('gauge', () => {
    it('should set a gauge value', () => {
      metrics.gauge('temperature', 72.5);

      const snapshot = metrics.snapshot();
      const gauge = Object.values(snapshot.gauges)[0];
      expect(gauge).toBeDefined();
      expect(gauge!.value).toBe(72.5);
    });

    it('should update gauge value', () => {
      metrics.gauge('temperature', 72.5);
      metrics.gauge('temperature', 75.0);

      const snapshot = metrics.snapshot();
      const gauge = Object.values(snapshot.gauges)[0];
      expect(gauge!.value).toBe(75.0);
    });
  });

  describe('histogram', () => {
    it('should track histogram values', () => {
      metrics.histogram('response_time', 0.1);
      metrics.histogram('response_time', 0.2);
      metrics.histogram('response_time', 0.5);

      const snapshot = metrics.snapshot();
      const hist = Object.values(snapshot.histograms)[0];
      expect(hist).toBeDefined();
      expect(hist!.count).toBe(3);
      expect(hist!.sum).toBeCloseTo(0.8, 4);
      expect(hist!.min).toBe(0.1);
      expect(hist!.max).toBe(0.5);
      expect(hist!.avg).toBeCloseTo(0.2667, 2);
    });

    it('should create bucket counts', () => {
      metrics.histogram('response_time', 0.05);
      metrics.histogram('response_time', 0.5);

      const snapshot = metrics.snapshot();
      const hist = Object.values(snapshot.histograms)[0];
      expect(hist!.buckets['+Inf']).toBe(2);
    });
  });

  describe('timing', () => {
    it('should track timing metrics', () => {
      metrics.timing('db_query', 50);
      metrics.timing('db_query', 100);
      metrics.timing('db_query', 150);

      const snapshot = metrics.snapshot();
      const timing = Object.values(snapshot.timings)[0];
      expect(timing).toBeDefined();
      expect(timing!.count).toBe(3);
      expect(timing!.totalMs).toBe(300);
      expect(timing!.avgMs).toBe(100);
      expect(timing!.minMs).toBe(50);
      expect(timing!.maxMs).toBe(150);
    });
  });

  describe('snapshot', () => {
    it('should return a complete snapshot', () => {
      metrics.counter('requests');
      metrics.gauge('active', 5);
      metrics.histogram('latency', 0.1);
      metrics.timing('query', 50);

      const snapshot = metrics.snapshot();
      expect(snapshot.timestamp).toBeTruthy();
      expect(Object.keys(snapshot.counters)).toHaveLength(1);
      expect(Object.keys(snapshot.gauges)).toHaveLength(1);
      expect(Object.keys(snapshot.histograms)).toHaveLength(1);
      expect(Object.keys(snapshot.timings)).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      metrics.counter('requests');
      metrics.gauge('active', 5);

      metrics.reset();

      const snapshot = metrics.snapshot();
      expect(Object.keys(snapshot.counters)).toHaveLength(0);
      expect(Object.keys(snapshot.gauges)).toHaveLength(0);
    });
  });
});

// ─── Auth Tests ────────────────────────────────────────────────

describe('Auth', () => {
  let auth: AuthImpl;

  beforeEach(() => {
    auth = new AuthImpl();
  });

  describe('setContext / getContext / clearContext', () => {
    it('should set and get auth context', () => {
      const ctx = {
        id: 'user-1',
        name: 'Test User',
        roles: ['admin'],
        permissions: ['read', 'write'],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
      };

      auth.setContext(ctx);
      expect(auth.getContext()).toEqual(ctx);
    });

    it('should return undefined when no context set', () => {
      expect(auth.getContext()).toBeUndefined();
    });

    it('should clear context', () => {
      auth.setContext({
        id: 'user-1',
        roles: [],
        permissions: [],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
      });

      auth.clearContext();
      expect(auth.getContext()).toBeUndefined();
    });
  });

  describe('hasPermission', () => {
    it('should return true for granted permission', () => {
      auth.setContext({
        id: 'user-1',
        roles: ['user'],
        permissions: ['read', 'write'],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
      });

      expect(auth.hasPermission('read')).toBe(true);
      expect(auth.hasPermission('write')).toBe(true);
    });

    it('should return false for missing permission', () => {
      auth.setContext({
        id: 'user-1',
        roles: ['user'],
        permissions: ['read'],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
      });

      expect(auth.hasPermission('delete')).toBe(false);
    });

    it('should return true for wildcard permission', () => {
      auth.setContext({
        id: 'admin',
        roles: ['admin'],
        permissions: ['*'],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
      });

      expect(auth.hasPermission('anything')).toBe(true);
    });

    it('should return false when no context set', () => {
      expect(auth.hasPermission('read')).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true for assigned role', () => {
      auth.setContext({
        id: 'user-1',
        roles: ['admin', 'user'],
        permissions: [],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
      });

      expect(auth.hasRole('admin')).toBe(true);
      expect(auth.hasRole('user')).toBe(true);
    });

    it('should return false for unassigned role', () => {
      auth.setContext({
        id: 'user-1',
        roles: ['user'],
        permissions: [],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
      });

      expect(auth.hasRole('admin')).toBe(false);
    });

    it('should return true for wildcard role', () => {
      auth.setContext({
        id: 'superadmin',
        roles: ['*'],
        permissions: [],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
      });

      expect(auth.hasRole('anything')).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when context is set and not expired', () => {
      auth.setContext({
        id: 'user-1',
        roles: [],
        permissions: [],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
      });

      expect(auth.isAuthenticated()).toBe(true);
    });

    it('should return false when no context set', () => {
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('should return false when context is expired', () => {
      auth.setContext({
        id: 'user-1',
        roles: [],
        permissions: [],
        provider: 'local',
        authenticatedAt: new Date(Date.now() - 120000).toISOString(),
        expiresAt: new Date(Date.now() - 60000).toISOString(), // expired 1 minute ago
      });

      expect(auth.isAuthenticated()).toBe(false);
    });

    it('should return true when context has no expiration', () => {
      auth.setContext({
        id: 'user-1',
        roles: [],
        permissions: [],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
      });

      expect(auth.isAuthenticated()).toBe(true);
    });
  });

  describe('isExpired', () => {
    it('should return true when no context set', () => {
      expect(auth.isExpired()).toBe(true);
    });

    it('should return false when context has no expiration', () => {
      auth.setContext({
        id: 'user-1',
        roles: [],
        permissions: [],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
      });

      expect(auth.isExpired()).toBe(false);
    });

    it('should return false when not yet expired', () => {
      auth.setContext({
        id: 'user-1',
        roles: [],
        permissions: [],
        provider: 'local',
        authenticatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // expires in 1 hour
      });

      expect(auth.isExpired()).toBe(false);
    });

    it('should return true when expired', () => {
      auth.setContext({
        id: 'user-1',
        roles: [],
        permissions: [],
        provider: 'local',
        authenticatedAt: new Date(Date.now() - 120000).toISOString(),
        expiresAt: new Date(Date.now() - 60000).toISOString(),
      });

      expect(auth.isExpired()).toBe(true);
    });
  });
});

// ─── Integration: Kernel components with EventBus ──────────────

describe('Kernel Integration', () => {
  it('should have all kernel components work together with shared EventBus', async () => {
    const eventBus = createEventBus();

    const config = new ConfigManagerImpl(eventBus);
    const security = new SecurityGateImpl(eventBus);
    const costTracker = new CostTrackerImpl(eventBus);
    const health = new HealthMonitorImpl(eventBus);
    const transport = new InMemoryTransport('debug');
    const logger = new LoggerImpl({ minLevel: 'debug', transports: [transport] });
    const metrics = new MetricsImpl();
    const auth = new AuthImpl();

    // Setup
    config.set('app.name', 'ALTER EGO OS');
    security.addPermissionRule({
      agentId: 'planner',
      actions: ['read', 'execute'],
      resources: ['missions.*', 'tasks.*'],
    });
    costTracker.setBudget('mission-1', 5.0);
    health.register('event-bus', async () => ({
      componentId: 'event-bus',
      healthy: true,
      message: 'Event bus operational',
      timestamp: new Date().toISOString(),
    }));
    auth.setContext({
      id: 'system',
      roles: ['admin'],
      permissions: ['*'],
      provider: 'local',
      authenticatedAt: new Date().toISOString(),
    });

    // Exercise
    logger.info('System initialized', { app: config.get<string>('app.name') });
    const authResult = security.authorize('planner', 'execute', 'missions.create');
    costTracker.recordUsage('planner', 'mission-1', 'gpt-4', {
      promptTokens: 500,
      completionTokens: 200,
      totalTokens: 700,
    }, 0.03);
    const healthStatus = await health.checkHealth('event-bus');
    metrics.counter('system.init');
    metrics.timing('health.check', 10);

    // Verify
    expect(authResult.allowed).toBe(true);
    expect(costTracker.getBudget('mission-1').currentSpendUsd).toBe(0.03);
    expect(healthStatus.healthy).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.hasPermission('read')).toBe(true);

    const metricsSnapshot = metrics.snapshot();
    expect(Object.keys(metricsSnapshot.counters)).toHaveLength(1);
    expect(Object.keys(metricsSnapshot.timings)).toHaveLength(1);

    // Check logger entries
    expect(transport.entries.length).toBeGreaterThan(0);
    expect(transport.entries[0]!.message).toBe('System initialized');

    // Cleanup
    health.stopHeartbeat();
  });

  it('should track audit events through the event bus', async () => {
    const eventBus = createEventBus();
    const security = new SecurityGateImpl(eventBus);

    const auditEvents: unknown[] = [];
    eventBus.subscribe('security.audit', (event) => {
      auditEvents.push(event.payload);
    });

    security.addPermissionRule({
      agentId: 'agent-1',
      actions: ['read'],
      resources: ['public.*'],
    });

    security.authorize('agent-1', 'read', 'public.data');
    security.authorize('agent-1', 'write', 'public.data'); // denied

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(auditEvents).toHaveLength(2);
  });
});
