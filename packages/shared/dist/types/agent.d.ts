export type AgentId = 'DEV' | 'SLIDES' | 'DOC' | 'DATA' | 'RECHERCHE' | 'EMAIL' | 'MARKETING';
export interface AgentConfig {
    id: AgentId;
    name: string;
    description: string;
    icon: string;
    color: string;
    systemPrompt: string;
    llmPool: LLMPoolConfig;
    reflectionCriteria: ReflectionCriteria[];
    maxIterations: number;
    confidenceThreshold: number;
    sandboxEnabled: boolean;
    deploymentTarget: 'cloudflare' | 'docker' | 'none';
    outputFormat: OutputFormat;
    dagTemplate: DAGTemplate;
    rateLimit: RateLimitConfig;
    /** MoA orchestration config — per-round strategies & voting parameters */
    moaConfig?: MoAAgentConfig;
}
/** Per-agent MoA configuration */
export interface MoAAgentConfig {
    /** Voting parameters */
    voting: import('./llm').MoAVotingConfig;
    /** Round-level configuration (propose / critique / refine) */
    rounds: import('./llm').MoARoundConfig[];
    /** Whether to inject reflection feedback into the refine round */
    feedbackInjection: boolean;
}
export interface LLMPoolConfig {
    primary: LLMProvider[];
    secondary: LLMProvider[];
    fallback: LLMProvider[];
}
export interface LLMProvider {
    id: string;
    name: string;
    model: string;
    maxTokens: number;
    temperature: number;
    costPer1kTokens: number;
    latencyMs: number;
    strengths: string[];
}
export interface ReflectionCriteria {
    name: string;
    weight: number;
    description: string;
    scoringGuide: string;
}
export interface OutputFormat {
    type: 'code' | 'slides' | 'document' | 'data' | 'report' | 'email' | 'campaign';
    extensions: string[];
    mimeType: string;
}
export interface DAGTemplate {
    nodes: DAGNode[];
    edges: DAGEdge[];
}
export interface DAGNode {
    id: string;
    label: string;
    level: number;
    type: 'input' | 'process' | 'output';
    agentRole: string;
}
export interface DAGEdge {
    from: string;
    to: string;
    condition?: string;
}
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    tier: 'free' | 'pro' | 'enterprise';
}
export interface AgentExecution {
    id: string;
    agentId: AgentId;
    userId: string;
    projectId: string;
    status: ExecutionStatus;
    input: string;
    output?: string;
    dagExecution: DAGExecutionState;
    reflectionScores: ReflectionScore[];
    iterations: number;
    totalTokensUsed: number;
    totalCost: number;
    createdAt: Date;
    completedAt?: Date;
    error?: string;
}
export type ExecutionStatus = 'queued' | 'running' | 'reflecting' | 'fixing' | 'completed' | 'completed_with_warnings' | 'failed' | 'cancelled';
export interface DAGExecutionState {
    currentLevel: number;
    completedNodes: string[];
    activeNodes: string[];
    pendingNodes: string[];
    results: Record<string, unknown>;
}
export interface ReflectionScore {
    iteration: number;
    criteria: string;
    score: number;
    confidence: number;
    feedback: string;
    weightedScore: number;
}
export interface AutoFixAttempt {
    level: 'pattern' | 'ast' | 'llm';
    attempt: number;
    maxAttempts: number;
    input: string;
    output: string;
    success: boolean;
    errorType?: string;
}
export interface AgentRegistryEntry {
    config: AgentConfig;
    isActive: boolean;
    version: string;
    lastUpdated: Date;
    usageCount: number;
    avgExecutionTimeMs: number;
    avgCost: number;
    successRate: number;
}
export type MoARound = 'propose' | 'critique' | 'refine';
export interface OrchestratorEvent {
    type: 'execution_start' | 'dag_level_start' | 'dag_node_start' | 'dag_node_complete' | 'dag_level_complete' | 'reflection_start' | 'reflection_complete' | 'autofix_start' | 'autofix_complete' | 'execution_complete' | 'execution_error' | 'moa_round' | 'cache_hit';
    executionId: string;
    agentId: AgentId;
    data?: unknown;
    timestamp: number;
}
/**
 * Configuration for the context management system.
 * Controls how files are compressed and scoped for LLM context injection.
 */
export interface ContextConfig {
    /** Maximum tokens allocated to a single file's content */
    maxTokensPerFile: number;
    /** Maximum total tokens across all files in a session */
    maxTotalTokens: number;
    /** Default compression strategy when content exceeds budget */
    compressionStrategy: 'skeleton' | 'summarize' | 'truncate' | 'selective';
    /** How many dependency hops to include when building context scope (BFS depth) */
    dependencyDepth: number;
}
/**
 * Token budget allocation for a generation session.
 * Tracks total, used, and per-file allocations.
 */
export interface TokenBudget {
    /** Total token budget for the session */
    total: number;
    /** Tokens consumed so far */
    used: number;
    /** Per-file token allocation */
    perFile: Record<string, number>;
}
//# sourceMappingURL=agent.d.ts.map