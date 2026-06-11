/**
 * ALTER EGO OS — Auth Implementation
 *
 * Authentication context management.
 * Delegates to external providers but manages the current auth context.
 */

import type { Auth, AuthContext } from './types.js';

// ─── Implementation ────────────────────────────────────────────

export class AuthImpl implements Auth {
  private context: AuthContext | undefined;

  setContext(context: AuthContext): void {
    this.context = context;
  }

  getContext(): AuthContext | undefined {
    return this.context;
  }

  clearContext(): void {
    this.context = undefined;
  }

  hasPermission(permission: string): boolean {
    if (!this.context) return false;
    return this.context.permissions.includes(permission) || this.context.permissions.includes('*');
  }

  hasRole(role: string): boolean {
    if (!this.context) return false;
    return this.context.roles.includes(role) || this.context.roles.includes('*');
  }

  isAuthenticated(): boolean {
    return this.context !== undefined && !this.isExpired();
  }

  isExpired(): boolean {
    if (!this.context) return true;
    if (!this.context.expiresAt) return false;

    const expiresAt = new Date(this.context.expiresAt).getTime();
    return Date.now() > expiresAt;
  }
}
