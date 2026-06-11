import { LLM_DEFAULTS } from '../types/llm';
export function calculateLLMCost(provider, promptTokens, completionTokens) {
    const pricing = LLM_DEFAULTS[provider];
    if (!pricing)
        return 0;
    const inputCost = (promptTokens / 1000) * pricing.costPer1kInput;
    const outputCost = (completionTokens / 1000) * pricing.costPer1kOutput;
    return inputCost + outputCost;
}
export function formatCost(costUsd) {
    if (costUsd < 0.01)
        return `$${costUsd.toFixed(4)}`;
    if (costUsd < 1)
        return `$${costUsd.toFixed(3)}`;
    return `$${costUsd.toFixed(2)}`;
}
export function estimateExecutionCost(providers, estimatedPromptTokens, estimatedCompletionTokens) {
    return providers.reduce((total, provider) => {
        return total + calculateLLMCost(provider, estimatedPromptTokens, estimatedCompletionTokens);
    }, 0);
}
//# sourceMappingURL=cost.js.map