import { z } from 'zod';
export const AgentIdSchema = z.enum(['DEV', 'SLIDES', 'DOC', 'DATA', 'RECHERCHE', 'EMAIL', 'MARKETING']);
export const LLMProviderSchema = z.object({
    id: z.string(),
    name: z.string(),
    model: z.string(),
    maxTokens: z.number().positive(),
    temperature: z.number().min(0).max(2),
    costPer1kTokens: z.number().nonnegative(),
    latencyMs: z.number().nonnegative(),
    strengths: z.array(z.string()),
});
export const LLMPoolConfigSchema = z.object({
    primary: z.array(LLMProviderSchema),
    secondary: z.array(LLMProviderSchema),
    fallback: z.array(LLMProviderSchema),
});
export const ReflectionCriteriaSchema = z.object({
    name: z.string(),
    weight: z.number().min(0).max(1),
    description: z.string(),
    scoringGuide: z.string(),
});
export const OutputFormatSchema = z.object({
    type: z.enum(['code', 'slides', 'document', 'data', 'report', 'email', 'campaign']),
    extensions: z.array(z.string()),
    mimeType: z.string(),
});
export const DAGNodeSchema = z.object({
    id: z.string(),
    label: z.string(),
    level: z.number().int().nonnegative(),
    type: z.enum(['input', 'process', 'output']),
    agentRole: z.string(),
});
export const DAGEdgeSchema = z.object({
    from: z.string(),
    to: z.string(),
    condition: z.string().optional(),
});
export const DAGTemplateSchema = z.object({
    nodes: z.array(DAGNodeSchema),
    edges: z.array(DAGEdgeSchema),
});
export const RateLimitConfigSchema = z.object({
    windowMs: z.number().positive(),
    maxRequests: z.number().positive(),
    tier: z.enum(['free', 'pro', 'enterprise']),
});
export const AgentConfigSchema = z.object({
    id: AgentIdSchema,
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    color: z.string(),
    systemPrompt: z.string(),
    llmPool: LLMPoolConfigSchema,
    reflectionCriteria: z.array(ReflectionCriteriaSchema),
    maxIterations: z.number().int().min(1).max(10),
    confidenceThreshold: z.number().min(0.5).max(1.0),
    sandboxEnabled: z.boolean(),
    deploymentTarget: z.enum(['cloudflare', 'docker', 'none']),
    outputFormat: OutputFormatSchema,
    dagTemplate: DAGTemplateSchema,
    rateLimit: RateLimitConfigSchema,
});
export const ExecutionStatusSchema = z.enum(['queued', 'running', 'reflecting', 'fixing', 'completed', 'completed_with_warnings', 'failed', 'cancelled']);
export const AgentExecutionSchema = z.object({
    id: z.string().uuid(),
    agentId: AgentIdSchema,
    userId: z.string().uuid(),
    projectId: z.string().uuid(),
    status: ExecutionStatusSchema,
    input: z.string().min(1),
    output: z.string().optional(),
    iterations: z.number().int().nonnegative(),
    totalTokensUsed: z.number().nonnegative(),
    totalCost: z.number().nonnegative(),
    createdAt: z.date(),
    completedAt: z.date().optional(),
    error: z.string().optional(),
});
//# sourceMappingURL=agent.js.map