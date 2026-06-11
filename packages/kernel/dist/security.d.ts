/**
 * ALTER EGO OS — SecurityGate Implementation
 *
 * Authorization, sandboxing, and audit logging.
 * Emits events on the EventBus for security-relevant actions.
 */
import { EventBus } from '@alterego/event-bus';
import type { SecurityGate, AuthorizationResult, SandboxContext, AuditEntry, AuditFilter, PermissionRule } from './types.js';
export declare class SecurityGateImpl implements SecurityGate {
    private readonly permissionRules;
    private readonly sandboxes;
    private readonly auditLog;
    private readonly eventBus;
    private auditCounter;
    constructor(eventBus: EventBus, initialRules?: PermissionRule[]);
    authorize(agentId: string, action: string, resource: string): AuthorizationResult;
    sandbox(agentId: string): SandboxContext;
    audit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void;
    getAuditLog(filter?: AuditFilter): AuditEntry[];
    addPermissionRule(rule: PermissionRule): void;
    removePermissionRule(agentId: string): void;
    getSandbox(agentId: string): SandboxContext | undefined;
    /**
     * Match a value against a list of patterns.
     * Supports wildcards: '*' matches everything, 'prefix.*' matches anything starting with 'prefix.'
     */
    private matchPattern;
    private getDefaultRateLimits;
}
//# sourceMappingURL=security.d.ts.map