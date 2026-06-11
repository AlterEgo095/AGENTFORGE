/**
 * ALTER EGO OS — Auth Implementation
 *
 * Authentication context management.
 * Delegates to external providers but manages the current auth context.
 */
// ─── Implementation ────────────────────────────────────────────
export class AuthImpl {
    context;
    setContext(context) {
        this.context = context;
    }
    getContext() {
        return this.context;
    }
    clearContext() {
        this.context = undefined;
    }
    hasPermission(permission) {
        if (!this.context)
            return false;
        return this.context.permissions.includes(permission) || this.context.permissions.includes('*');
    }
    hasRole(role) {
        if (!this.context)
            return false;
        return this.context.roles.includes(role) || this.context.roles.includes('*');
    }
    isAuthenticated() {
        return this.context !== undefined && !this.isExpired();
    }
    isExpired() {
        if (!this.context)
            return true;
        if (!this.context.expiresAt)
            return false;
        const expiresAt = new Date(this.context.expiresAt).getTime();
        return Date.now() > expiresAt;
    }
}
//# sourceMappingURL=auth.js.map