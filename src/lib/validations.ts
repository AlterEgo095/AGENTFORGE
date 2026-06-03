import { z } from 'zod';

export const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long'),
  agentType: z.enum(['DEV', 'SLIDES', 'DOC', 'DATA', 'RESEARCH', 'EMAIL', 'MARKETING']),
  projectId: z.string().optional(),
  threshold: z.number().min(0).max(1).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  agentType: z.enum(['DEV', 'SLIDES', 'DOC', 'DATA', 'RESEARCH', 'EMAIL', 'MARKETING']),
  userId: z.string().min(1, 'User ID is required'),
  config: z.record(z.unknown()).optional(),
});

export const sessionsQuerySchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

export type GenerateInput = z.infer<typeof generateSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
