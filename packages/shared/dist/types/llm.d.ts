export type LLMId = 'claude-3.7-sonnet' | 'gpt-4o' | 'deepseek-r1' | 'gemini-2.5-pro' | 'gpt-o1' | 'llama-3.3' | 'qwen-2.5' | 'mistral-large' | 'gemini-2.0-flash';
export interface LLMCall {
    id: string;
    provider: LLMId;
    model: string;
    messages: LLMMessage[];
    temperature: number;
    maxTokens: number;
    response?: LLMResponse;
    latencyMs?: number;
    tokensUsed?: TokenUsage;
    cost?: number;
    timestamp: Date;
}
export interface LLMMessage {
    role: 'system' | 'user' | 'assistant' | 'reflection';
    content: string;
    metadata?: Record<string, unknown>;
}
export interface LLMResponse {
    id: string;
    content: string;
    model: string;
    usage: TokenUsage;
    finishReason: 'stop' | 'length' | 'content_filter';
    latencyMs: number;
}
export interface TokenUsage {
    prompt: number;
    completion: number;
    total: number;
}
export interface MoAResult {
    proposals: MoAProposal[];
    aggregationStrategy: AggregationStrategy;
    finalOutput: string;
    totalTokens: number;
    totalCost: number;
    totalLatencyMs: number;
    votingDetails?: MoAVotingDetails;
}
export interface MoAVotingConfig {
    /** Criteria weights for multi-criteria voting (e.g. { quality: 0.4, costEfficiency: 0.3, speed: 0.3 }) */
    criteriaWeights: Record<string, number>;
    /** Minimum fraction of proposals that must agree for consensus (0–1) */
    minConsensus: number;
    /** Jaccard-like threshold for proposal deduplication (0–1). 0.7 = 70% similarity → dedup */
    deduplicationThreshold: number;
}
export interface MoARoundConfig {
    round: 'propose' | 'critique' | 'refine';
    /** How many LLMs to invoke in this round */
    providerCount: number;
    /** Temperature override for this round */
    temperature: number;
    /** Strategy for selecting which providers participate */
    strategy: 'all' | 'top_n' | 'epsilon_greedy';
}
export interface MoAVotingDetails {
    /** Per-criterion scores for each proposal */
    proposalScores: Array<{
        provider: LLMId;
        weightedScore: number;
        criteriaBreakdown: Record<string, number>;
    }>;
    /** How many proposals were deduplicated */
    deduplicationCount: number;
    /** Whether consensus was reached */
    consensusReached: boolean;
    /** The consensus threshold used */
    consensusThreshold: number;
    /** Number of proposals that passed the threshold */
    proposalsAboveThreshold: number;
    /** Winning proposal provider */
    winner: LLMId;
}
export interface MoAProposal {
    provider: LLMId;
    content: string;
    confidence: number;
    tokensUsed: number;
    cost: number;
    latencyMs: number;
}
export type AggregationStrategy = 'weighted_vote' | 'consensus' | 'best_of' | 'cascade' | 'ensemble';
export interface LLMRouterDecision {
    selectedProviders: LLMId[];
    strategy: AggregationStrategy;
    estimatedCost: number;
    estimatedLatencyMs: number;
    reasoning: string;
}
export interface LLMCostEntry {
    id: string;
    userId: string;
    executionId: string;
    provider: LLMId;
    tokensPrompt: number;
    tokensCompletion: number;
    costUsd: number;
    timestamp: Date;
}
export interface RoutingMetrics {
    provider: LLMId;
    taskType: string;
    quality: number;
    cost: number;
    latency: number;
    reward: number;
    epsilon: number;
    selectedAt: number;
}
export interface RLState {
    epsilon: number;
    decayRate: number;
    minEpsilon: number;
    totalDecisions: number;
    explorationCount: number;
}
export interface ProviderLearningData {
    provider: LLMId;
    taskType: string;
    avgQuality: number;
    avgCost: number;
    avgLatency: number;
    sampleCount: number;
    lastUpdated: number;
}
export declare const LLM_DEFAULTS: Record<LLMId, {
    maxTokens: number;
    temperature: number;
    costPer1kInput: number;
    costPer1kOutput: number;
}>;
//# sourceMappingURL=llm.d.ts.map