// ============================================================
// AgentForge - Cost Utilities Unit Tests
// Tests for cost calculation per provider, cost formatting,
// and execution cost estimation
// ============================================================
import { describe, it, expect } from 'vitest';
import { calculateLLMCost, formatCost, estimateExecutionCost } from '../cost';
describe('Cost Utilities', () => {
    // ═══════════════════════════════════════════════════════
    // Cost Calculation per Provider
    // ═══════════════════════════════════════════════════════
    describe('calculateLLMCost', () => {
        it('should calculate cost for GPT-4o', () => {
            // gpt-4o: $0.005/1k input, $0.015/1k output
            const cost = calculateLLMCost('gpt-4o', 1000, 1000);
            // (1000/1000) * 0.005 + (1000/1000) * 0.015 = 0.005 + 0.015 = 0.02
            expect(cost).toBeCloseTo(0.02, 6);
        });
        it('should calculate cost for Claude 3.7 Sonnet', () => {
            // claude-3.7-sonnet: $0.003/1k input, $0.015/1k output
            const cost = calculateLLMCost('claude-3.7-sonnet', 1000, 500);
            // (1000/1000) * 0.003 + (500/1000) * 0.015 = 0.003 + 0.0075 = 0.0105
            expect(cost).toBeCloseTo(0.0105, 6);
        });
        it('should calculate cost for Gemini 2.0 Flash (cheapest)', () => {
            // gemini-2.0-flash: $0.0001/1k input, $0.0004/1k output
            const cost = calculateLLMCost('gemini-2.0-flash', 1000, 1000);
            // (1000/1000) * 0.0001 + (1000/1000) * 0.0004 = 0.0001 + 0.0004 = 0.0005
            expect(cost).toBeCloseTo(0.0005, 6);
        });
        it('should calculate cost for GPT-o1 (most expensive)', () => {
            // gpt-o1: $0.015/1k input, $0.06/1k output
            const cost = calculateLLMCost('gpt-o1', 1000, 1000);
            // (1000/1000) * 0.015 + (1000/1000) * 0.06 = 0.015 + 0.06 = 0.075
            expect(cost).toBeCloseTo(0.075, 6);
        });
        it('should calculate cost for DeepSeek R1', () => {
            // deepseek-r1: $0.0014/1k input, $0.0028/1k output
            const cost = calculateLLMCost('deepseek-r1', 2000, 1000);
            // (2000/1000) * 0.0014 + (1000/1000) * 0.0028 = 0.0028 + 0.0028 = 0.0056
            expect(cost).toBeCloseTo(0.0056, 6);
        });
        it('should return 0 for zero tokens', () => {
            const cost = calculateLLMCost('gpt-4o', 0, 0);
            expect(cost).toBe(0);
        });
        it('should return 0 for unknown provider', () => {
            const cost = calculateLLMCost('unknown-model', 1000, 1000);
            expect(cost).toBe(0);
        });
        it('should handle partial thousand tokens', () => {
            // gpt-4o: $0.005/1k input, $0.015/1k output
            const cost = calculateLLMCost('gpt-4o', 500, 250);
            // (500/1000) * 0.005 + (250/1000) * 0.015 = 0.0025 + 0.00375 = 0.00625
            expect(cost).toBeCloseTo(0.00625, 6);
        });
        it('should calculate cost for all 9 providers', () => {
            const providers = [
                'claude-3.7-sonnet',
                'gpt-4o',
                'deepseek-r1',
                'gemini-2.5-pro',
                'gpt-o1',
                'llama-3.3',
                'qwen-2.5',
                'mistral-large',
                'gemini-2.0-flash',
            ];
            for (const provider of providers) {
                const cost = calculateLLMCost(provider, 1000, 1000);
                expect(cost).toBeGreaterThan(0);
                expect(typeof cost).toBe('number');
            }
        });
        it('should charge more for output tokens than input tokens on same provider', () => {
            const inputCost = calculateLLMCost('gpt-4o', 1000, 0);
            const outputCost = calculateLLMCost('gpt-4o', 0, 1000);
            // Output is typically more expensive
            expect(outputCost).toBeGreaterThan(inputCost);
        });
    });
    // ═══════════════════════════════════════════════════════
    // Cost Formatting
    // ═══════════════════════════════════════════════════════
    describe('formatCost', () => {
        it('should format very small costs with 4 decimal places', () => {
            // Costs < $0.01
            expect(formatCost(0.001)).toBe('$0.0010');
            expect(formatCost(0.005)).toBe('$0.0050');
            expect(formatCost(0.0099)).toBe('$0.0099');
        });
        it('should format medium costs with 3 decimal places', () => {
            // Costs between $0.01 and $1
            expect(formatCost(0.01)).toBe('$0.010');
            expect(formatCost(0.1)).toBe('$0.100');
            expect(formatCost(0.5)).toBe('$0.500');
            expect(formatCost(0.999)).toBe('$0.999');
        });
        it('should format larger costs with 2 decimal places', () => {
            // Costs >= $1
            expect(formatCost(1)).toBe('$1.00');
            expect(formatCost(10.5)).toBe('$10.50');
            expect(formatCost(100)).toBe('$100.00');
            expect(formatCost(99.999)).toBe('$100.00'); // rounds up
        });
        it('should format zero correctly', () => {
            // 0 < 0.01, so 4 decimal places
            expect(formatCost(0)).toBe('$0.0000');
        });
        it('should always include dollar sign', () => {
            expect(formatCost(0.001)).toMatch(/^\$/);
            expect(formatCost(0.5)).toMatch(/^\$/);
            expect(formatCost(100)).toMatch(/^\$/);
        });
    });
    // ═══════════════════════════════════════════════════════
    // Execution Cost Estimation
    // ═══════════════════════════════════════════════════════
    describe('estimateExecutionCost', () => {
        it('should estimate cost for a single provider', () => {
            const cost = estimateExecutionCost(['gpt-4o'], 1000, 500);
            // (1000/1000) * 0.005 + (500/1000) * 0.015 = 0.005 + 0.0075 = 0.0125
            expect(cost).toBeCloseTo(0.0125, 6);
        });
        it('should sum costs for multiple providers', () => {
            const singleCost = estimateExecutionCost(['gpt-4o'], 1000, 500);
            const doubleCost = estimateExecutionCost(['gpt-4o', 'gpt-4o'], 1000, 500);
            expect(doubleCost).toBeCloseTo(singleCost * 2, 6);
        });
        it('should return 0 for empty provider list', () => {
            const cost = estimateExecutionCost([], 1000, 500);
            expect(cost).toBe(0);
        });
        it('should handle providers with different pricing', () => {
            const cost = estimateExecutionCost(['gpt-4o', 'gemini-2.0-flash'], 1000, 1000);
            // gpt-4o: 0.005 + 0.015 = 0.02
            // gemini-2.0-flash: 0.0001 + 0.0004 = 0.0005
            // total = 0.0205
            expect(cost).toBeCloseTo(0.0205, 6);
        });
        it('should skip unknown providers in estimation', () => {
            const cost = estimateExecutionCost(['gpt-4o', 'unknown-model'], 1000, 1000);
            // Only gpt-4o contributes: 0.005 + 0.015 = 0.02
            expect(cost).toBeCloseTo(0.02, 6);
        });
        it('should estimate cost for MoA with 3 providers + fallback', () => {
            // Typical MoA setup: 3 primary + 1 fallback
            const providers = [
                'claude-3.7-sonnet',
                'gpt-4o',
                'deepseek-r1',
                'gemini-2.0-flash',
            ];
            const cost = estimateExecutionCost(providers, 2000, 1000);
            // Each provider gets the same token estimates
            expect(cost).toBeGreaterThan(0);
            expect(typeof cost).toBe('number');
        });
        it('should increase cost proportionally with token count', () => {
            const cost1 = estimateExecutionCost(['gpt-4o'], 1000, 500);
            const cost2 = estimateExecutionCost(['gpt-4o'], 2000, 1000);
            expect(cost2).toBeCloseTo(cost1 * 2, 6);
        });
    });
});
//# sourceMappingURL=cost.test.js.map