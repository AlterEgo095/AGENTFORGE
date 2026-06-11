// ============================================================
// AgentForge - LLM Types
// 9-LLM Mixture-of-Agents Pool
// ============================================================
export const LLM_DEFAULTS = {
    'claude-3.7-sonnet': { maxTokens: 8192, temperature: 0.3, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
    'gpt-4o': { maxTokens: 8192, temperature: 0.3, costPer1kInput: 0.005, costPer1kOutput: 0.015 },
    'deepseek-r1': { maxTokens: 8192, temperature: 0.5, costPer1kInput: 0.0014, costPer1kOutput: 0.0028 },
    'gemini-2.5-pro': { maxTokens: 8192, temperature: 0.3, costPer1kInput: 0.00125, costPer1kOutput: 0.005 },
    'gpt-o1': { maxTokens: 16384, temperature: 0.7, costPer1kInput: 0.015, costPer1kOutput: 0.06 },
    'llama-3.3': { maxTokens: 4096, temperature: 0.5, costPer1kInput: 0.0008, costPer1kOutput: 0.0008 },
    'qwen-2.5': { maxTokens: 4096, temperature: 0.5, costPer1kInput: 0.0005, costPer1kOutput: 0.0005 },
    'mistral-large': { maxTokens: 8192, temperature: 0.3, costPer1kInput: 0.002, costPer1kOutput: 0.006 },
    'gemini-2.0-flash': { maxTokens: 8192, temperature: 0.5, costPer1kInput: 0.0001, costPer1kOutput: 0.0004 },
};
//# sourceMappingURL=llm.js.map