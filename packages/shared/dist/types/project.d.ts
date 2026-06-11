export interface Project {
    id: string;
    userId: string;
    name: string;
    description: string;
    agentId: string;
    status: ProjectStatus;
    config: ProjectConfig;
    files: ProjectFile[];
    deployments: Deployment[];
    createdAt: Date;
    updatedAt: Date;
}
export type ProjectStatus = 'draft' | 'generating' | 'reviewing' | 'deployed' | 'failed' | 'archived';
export interface ProjectConfig {
    framework?: string;
    language?: string;
    styling?: string;
    database?: string;
    features?: string[];
    environment?: Record<string, string>;
}
export interface ProjectFile {
    path: string;
    content: string;
    language: string;
    size: number;
    hash: string;
}
export interface Deployment {
    id: string;
    projectId: string;
    platform: 'cloudflare' | 'docker' | 'vercel' | 'custom';
    url: string;
    status: 'pending' | 'deploying' | 'live' | 'failed' | 'stopped';
    createdAt: Date;
    updatedAt: Date;
}
export interface GenerationSession {
    id: string;
    projectId: string;
    userId: string;
    agentId: string;
    prompt: string;
    dagLevels: DAGLevelResult[];
    reflectionIterations: number;
    autoFixAttempts: number;
    status: 'running' | 'completed' | 'failed';
    outputFiles: ProjectFile[];
    totalTokensUsed: number;
    totalCost: number;
    createdAt: Date;
    completedAt?: Date;
}
export interface DAGLevelResult {
    level: number;
    nodes: DAGNodeResult[];
    totalLatencyMs: number;
}
export interface DAGNodeResult {
    nodeId: string;
    status: 'success' | 'failed' | 'skipped';
    output?: string;
    tokensUsed?: number;
    cost?: number;
    latencyMs?: number;
}
//# sourceMappingURL=project.d.ts.map