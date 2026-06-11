/**
 * ALTER EGO OS — SecurityGate Implementation
 *
 * Authorization, sandboxing, and audit logging.
 * Emits events on the EventBus for security-relevant actions.
 */

import { EventBus } from '@alterego/event-bus';
import type {
  SecurityGate,
  AuthorizationResult,
  SandboxContext,
  AuditEntry,
  AuditFilter,
  PermissionRule,
  RateLimit,
} from './types.js';

// ─── Implementation ────────────────────────────────────────────

export class SecurityGateImpl implements SecurityGate {
  private readonly permissionRules: Map<string, PermissionRule> = new Map();
  private readonly sandboxes: Map<string, SandboxContext> = new Map();
  private readonly auditLog: AuditEntry[] = [];
  private readonly eventBus: EventBus;
  private auditCounter = 0;

  constructor(eventBus: EventBus, initialRules?: PermissionRule[]) {
    this.eventBus = eventBus;
    if (initialRules) {
      for (const rule of initialRules) {
        this.permissionRules.set(rule.agentId, rule);
      }
    }
  }

  authorize(agentId: string, action: string, resource: string): AuthorizationResult {
    const rule = this.permissionRules.get(agentId);

    if (!rule) {
      const result: AuthorizationResult = {
        allowed: false,
        reason: `No permission rules found for agent "${agentId}"`,
      };

      this.audit({
        agentId,
        action,
        resource,
        allowed: false,
        reason: result.reason,
        metadata: {},
      });

      this.eventBus.emit({
        type: 'security.authorization.denied',
        payload: { agentId, action, resource, reason: result.reason ?? 'No rules' },
        source: 'kernel.security',
      });

      return result;
    }

    // Check if action is allowed
    const actionAllowed = this.matchPattern(action, rule.actions);
    if (!actionAllowed) {
      const result: AuthorizationResult = {
        allowed: false,
        reason: `Action "${action}" is not allowed for agent "${agentId}"`,
        permissions: rule.actions,
      };

      this.audit({
        agentId,
        action,
        resource,
        allowed: false,
        reason: result.reason,
        metadata: {},
      });

      this.eventBus.emit({
        type: 'security.authorization.denied',
        payload: { agentId, action, resource, reason: result.reason ?? 'Action denied' },
        source: 'kernel.security',
      });

      return result;
    }

    // Check if resource is allowed
    const resourceAllowed = this.matchPattern(resource, rule.resources);
    if (!resourceAllowed) {
      const result: AuthorizationResult = {
        allowed: false,
        reason: `Resource "${resource}" is not accessible by agent "${agentId}"`,
        permissions: rule.actions,
      };

      this.audit({
        agentId,
        action,
        resource,
        allowed: false,
        reason: result.reason,
        metadata: {},
      });

      this.eventBus.emit({
        type: 'security.authorization.denied',
        payload: { agentId, action, resource, reason: result.reason ?? 'Resource denied' },
        source: 'kernel.security',
      });

      return result;
    }

    const result: AuthorizationResult = {
      allowed: true,
      permissions: rule.actions,
    };

    this.audit({
      agentId,
      action,
      resource,
      allowed: true,
      metadata: {},
    });

    return result;
  }

  sandbox(agentId: string): SandboxContext {
    const existing = this.sandboxes.get(agentId);
    if (existing) {
      return existing;
    }

    const rule = this.permissionRules.get(agentId);
    const context: SandboxContext = {
      agentId,
      allowedResources: rule?.resources ?? [],
      allowedActions: rule?.actions ?? [],
      rateLimits: this.getDefaultRateLimits(),
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.sandboxes.set(agentId, context);
    return context;
  }

  audit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    const fullEntry: AuditEntry = {
      ...entry,
      id: `audit_${++this.auditCounter}_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    this.auditLog.push(fullEntry);

    this.eventBus.emit({
      type: 'security.audit',
      payload: fullEntry,
      source: 'kernel.security',
    });
  }

  getAuditLog(filter?: AuditFilter): AuditEntry[] {
    let entries = [...this.auditLog];

    if (!filter) {
      return entries;
    }

    if (filter.agentId) {
      entries = entries.filter((e) => e.agentId === filter.agentId);
    }
    if (filter.action) {
      entries = entries.filter((e) => e.action === filter.action);
    }
    if (filter.resource) {
      entries = entries.filter((e) => e.resource === filter.resource);
    }
    if (filter.allowed !== undefined) {
      entries = entries.filter((e) => e.allowed === filter.allowed);
    }
    if (filter.from) {
      const fromDate = new Date(filter.from).getTime();
      entries = entries.filter((e) => new Date(e.timestamp).getTime() >= fromDate);
    }
    if (filter.to) {
      const toDate = new Date(filter.to).getTime();
      entries = entries.filter((e) => new Date(e.timestamp).getTime() <= toDate);
    }
    if (filter.limit) {
      entries = entries.slice(-filter.limit);
    }

    return entries;
  }

  addPermissionRule(rule: PermissionRule): void {
    this.permissionRules.set(rule.agentId, rule);

    // Update sandbox if it exists
    const sandbox = this.sandboxes.get(rule.agentId);
    if (sandbox) {
      sandbox.allowedActions = rule.actions;
      sandbox.allowedResources = rule.resources;
    }
  }

  removePermissionRule(agentId: string): void {
    this.permissionRules.delete(agentId);
    this.sandboxes.delete(agentId);
  }

  getSandbox(agentId: string): SandboxContext | undefined {
    return this.sandboxes.get(agentId);
  }

  // ─── Private Helpers ─────────────────────────────────────

  /**
   * Match a value against a list of patterns.
   * Supports wildcards: '*' matches everything, 'prefix.*' matches anything starting with 'prefix.'
   */
  private matchPattern(value: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (pattern === '*') return true;
      if (pattern === value) return true;

      // Support glob-style wildcard: "resource.*" matches "resource.read", "resource.write", etc.
      if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -2);
        if (value.startsWith(prefix + '.') || value === prefix) {
          return true;
        }
      }

      // Support glob-style wildcard: "*.suffix" matches "read.suffix", "write.suffix", etc.
      if (pattern.startsWith('*.')) {
        const suffix = pattern.slice(1);
        if (value.endsWith(suffix)) {
          return true;
        }
      }
    }
    return false;
  }

  private getDefaultRateLimits(): RateLimit[] {
    return [
      { action: '*', maxCalls: 1000, windowMs: 60_000 },
    ];
  }
}
