import { z } from 'zod';
export const CreateProjectSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    agentId: z.enum(['DEV', 'SLIDES', 'DOC', 'DATA', 'RECHERCHE', 'EMAIL', 'MARKETING']),
    config: z.object({
        framework: z.string().optional(),
        language: z.string().optional(),
        styling: z.string().optional(),
        database: z.string().optional(),
        features: z.array(z.string()).optional(),
    }).optional(),
});
export const ExecuteAgentSchema = z.object({
    projectId: z.string().uuid().optional(),
    prompt: z.string().min(1).max(10000),
    context: z.record(z.unknown()).optional(),
});
export const DeployProjectSchema = z.object({
    projectId: z.string().uuid(),
    platform: z.enum(['cloudflare', 'docker', 'vercel', 'custom']),
    config: z.record(z.unknown()).optional(),
});
//# sourceMappingURL=project.js.map