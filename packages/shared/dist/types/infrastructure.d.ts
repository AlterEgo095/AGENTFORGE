export interface SandboxConfig {
    provider: 'e2b' | 'docker';
    template: string;
    timeoutMs: number;
    memoryMb: number;
    cpuCores: number;
    networkAccess: boolean;
    commandBlacklist: string[];
}
export interface CacheConfig {
    l1: L1CacheConfig;
    l2: L2CacheConfig;
}
export interface L1CacheConfig {
    enabled: boolean;
    maxSizeMb: number;
    ttlSeconds: number;
}
export interface L2CacheConfig {
    enabled: boolean;
    redisUrl: string;
    ttlSeconds: number;
}
export interface SecurityConfig {
    jwt: JWTConfig;
    rateLimit: RateLimitTierConfig;
    cors: CORSConfig;
    sandbox: SandboxSecurityConfig;
}
export interface JWTConfig {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
}
export interface RateLimitTierConfig {
    free: {
        windowMs: number;
        maxRequests: number;
    };
    pro: {
        windowMs: number;
        maxRequests: number;
    };
    enterprise: {
        windowMs: number;
        maxRequests: number;
    };
}
export interface CORSConfig {
    origins: string[];
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
}
export interface SandboxSecurityConfig {
    commandBlacklist: string[];
    networkBlacklist: string[];
    maxExecutionTimeMs: number;
    maxMemoryMb: number;
}
export interface HealthCheckResult {
    service: string;
    status: 'healthy' | 'degraded' | 'down';
    latencyMs: number;
    details?: Record<string, unknown>;
    timestamp: Date;
}
export interface SystemMetrics {
    activeExecutions: number;
    queuedExecutions: number;
    totalUsers: number;
    totalProjects: number;
    avgResponseTimeMs: number;
    errorRate: number;
    cacheHitRate: number;
    tokensUsedToday: number;
    costToday: number;
    uptime: number;
}
//# sourceMappingURL=infrastructure.d.ts.map