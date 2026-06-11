import type { LLMId } from '../types';
export declare function calculateLLMCost(provider: LLMId, promptTokens: number, completionTokens: number): number;
export declare function formatCost(costUsd: number): string;
export declare function estimateExecutionCost(providers: LLMId[], estimatedPromptTokens: number, estimatedCompletionTokens: number): number;
//# sourceMappingURL=cost.d.ts.map