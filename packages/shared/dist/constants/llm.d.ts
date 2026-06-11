export declare const LLM_PROVIDERS: {
    readonly 'claude-3.7-sonnet': {
        readonly id: "claude-3.7-sonnet";
        readonly name: "Claude 3.7 Sonnet";
        readonly provider: "anthropic";
        readonly baseUrl: "https://api.anthropic.com/v1";
        readonly model: "claude-3-7-sonnet-20250219";
        readonly contextWindow: 200000;
        readonly maxOutputTokens: 8192;
        readonly supportsStreaming: true;
        readonly supportsTools: true;
        readonly supportsVision: true;
    };
    readonly 'gpt-4o': {
        readonly id: "gpt-4o";
        readonly name: "GPT-4o";
        readonly provider: "openai";
        readonly baseUrl: "https://api.openai.com/v1";
        readonly model: "gpt-4o-2024-11-20";
        readonly contextWindow: 128000;
        readonly maxOutputTokens: 16384;
        readonly supportsStreaming: true;
        readonly supportsTools: true;
        readonly supportsVision: true;
    };
    readonly 'deepseek-r1': {
        readonly id: "deepseek-r1";
        readonly name: "DeepSeek R1";
        readonly provider: "deepseek";
        readonly baseUrl: "https://api.deepseek.com/v1";
        readonly model: "deepseek-reasoner";
        readonly contextWindow: 65536;
        readonly maxOutputTokens: 8192;
        readonly supportsStreaming: true;
        readonly supportsTools: false;
        readonly supportsVision: false;
    };
    readonly 'gemini-2.5-pro': {
        readonly id: "gemini-2.5-pro";
        readonly name: "Gemini 2.5 Pro";
        readonly provider: "google";
        readonly baseUrl: "https://generativelanguage.googleapis.com/v1beta";
        readonly model: "gemini-2.5-pro-preview-05-06";
        readonly contextWindow: 1048576;
        readonly maxOutputTokens: 65536;
        readonly supportsStreaming: true;
        readonly supportsTools: true;
        readonly supportsVision: true;
    };
    readonly 'gpt-o1': {
        readonly id: "gpt-o1";
        readonly name: "GPT-o1";
        readonly provider: "openai";
        readonly baseUrl: "https://api.openai.com/v1";
        readonly model: "o1-2024-12-17";
        readonly contextWindow: 200000;
        readonly maxOutputTokens: 100000;
        readonly supportsStreaming: false;
        readonly supportsTools: true;
        readonly supportsVision: true;
    };
    readonly 'llama-3.3': {
        readonly id: "llama-3.3";
        readonly name: "Llama 3.3 70B";
        readonly provider: "meta";
        readonly baseUrl: "https://api.together.xyz/v1";
        readonly model: "meta-llama/Llama-3.3-70B-Instruct-Turbo";
        readonly contextWindow: 131072;
        readonly maxOutputTokens: 4096;
        readonly supportsStreaming: true;
        readonly supportsTools: false;
        readonly supportsVision: false;
    };
    readonly 'qwen-2.5': {
        readonly id: "qwen-2.5";
        readonly name: "Qwen 2.5 72B";
        readonly provider: "alibaba";
        readonly baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1";
        readonly model: "qwen-2.5-72b-instruct";
        readonly contextWindow: 131072;
        readonly maxOutputTokens: 8192;
        readonly supportsStreaming: true;
        readonly supportsTools: true;
        readonly supportsVision: false;
    };
    readonly 'mistral-large': {
        readonly id: "mistral-large";
        readonly name: "Mistral Large";
        readonly provider: "mistral";
        readonly baseUrl: "https://api.mistral.ai/v1";
        readonly model: "mistral-large-2411";
        readonly contextWindow: 131072;
        readonly maxOutputTokens: 8192;
        readonly supportsStreaming: true;
        readonly supportsTools: true;
        readonly supportsVision: false;
    };
    readonly 'gemini-2.0-flash': {
        readonly id: "gemini-2.0-flash";
        readonly name: "Gemini 2.0 Flash";
        readonly provider: "google";
        readonly baseUrl: "https://generativelanguage.googleapis.com/v1beta";
        readonly model: "gemini-2.0-flash-001";
        readonly contextWindow: 1048576;
        readonly maxOutputTokens: 8192;
        readonly supportsStreaming: true;
        readonly supportsTools: true;
        readonly supportsVision: true;
    };
};
export declare const MOA_STRATEGIES: {
    readonly WEIGHTED_VOTE: "weighted_vote";
    readonly CONSENSUS: "consensus";
    readonly BEST_OF: "best_of";
    readonly CASCADE: "cascade";
    readonly ENSEMBLE: "ensemble";
};
export declare const DEFAULT_MOA_CONFIG: {
    maxConcurrentCalls: number;
    timeoutMs: number;
    retryAttempts: number;
    retryDelayMs: number;
    aggregationStrategy: "weighted_vote";
    minProposalsForConsensus: number;
    confidenceThreshold: number;
};
//# sourceMappingURL=llm.d.ts.map