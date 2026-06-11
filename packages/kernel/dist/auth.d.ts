/**
 * ALTER EGO OS — Auth Implementation
 *
 * Authentication context management.
 * Delegates to external providers but manages the current auth context.
 */
import type { Auth, AuthContext } from './types.js';
export declare class AuthImpl implements Auth {
    private context;
    setContext(context: AuthContext): void;
    getContext(): AuthContext | undefined;
    clearContext(): void;
    hasPermission(permission: string): boolean;
    hasRole(role: string): boolean;
    isAuthenticated(): boolean;
    isExpired(): boolean;
}
//# sourceMappingURL=auth.d.ts.map