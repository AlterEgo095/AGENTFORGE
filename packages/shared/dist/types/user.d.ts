export interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    tier: UserTier;
    usage: UserUsage;
    preferences: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
}
export type UserTier = 'free' | 'pro' | 'enterprise';
export interface UserUsage {
    executionsThisMonth: number;
    tokensUsedThisMonth: number;
    costThisMonth: number;
    projectsCount: number;
    lastExecutionAt?: Date;
}
export interface UserPreferences {
    defaultAgentId?: string;
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'fr' | 'es' | 'de';
    notifications: NotificationPreferences;
}
export interface NotificationPreferences {
    email: boolean;
    push: boolean;
    deploymentComplete: boolean;
    executionFailed: boolean;
    costAlerts: boolean;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    tier: UserTier;
}
//# sourceMappingURL=user.d.ts.map