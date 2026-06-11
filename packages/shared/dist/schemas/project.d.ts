import { z } from 'zod';
export declare const CreateProjectSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    agentId: z.ZodEnum<["DEV", "SLIDES", "DOC", "DATA", "RECHERCHE", "EMAIL", "MARKETING"]>;
    config: z.ZodOptional<z.ZodObject<{
        framework: z.ZodOptional<z.ZodString>;
        language: z.ZodOptional<z.ZodString>;
        styling: z.ZodOptional<z.ZodString>;
        database: z.ZodOptional<z.ZodString>;
        features: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        language?: string | undefined;
        framework?: string | undefined;
        styling?: string | undefined;
        database?: string | undefined;
        features?: string[] | undefined;
    }, {
        language?: string | undefined;
        framework?: string | undefined;
        styling?: string | undefined;
        database?: string | undefined;
        features?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    agentId: "DEV" | "SLIDES" | "DOC" | "DATA" | "RECHERCHE" | "EMAIL" | "MARKETING";
    description?: string | undefined;
    config?: {
        language?: string | undefined;
        framework?: string | undefined;
        styling?: string | undefined;
        database?: string | undefined;
        features?: string[] | undefined;
    } | undefined;
}, {
    name: string;
    agentId: "DEV" | "SLIDES" | "DOC" | "DATA" | "RECHERCHE" | "EMAIL" | "MARKETING";
    description?: string | undefined;
    config?: {
        language?: string | undefined;
        framework?: string | undefined;
        styling?: string | undefined;
        database?: string | undefined;
        features?: string[] | undefined;
    } | undefined;
}>;
export declare const ExecuteAgentSchema: z.ZodObject<{
    projectId: z.ZodOptional<z.ZodString>;
    prompt: z.ZodString;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    projectId?: string | undefined;
    context?: Record<string, unknown> | undefined;
}, {
    prompt: string;
    projectId?: string | undefined;
    context?: Record<string, unknown> | undefined;
}>;
export declare const DeployProjectSchema: z.ZodObject<{
    projectId: z.ZodString;
    platform: z.ZodEnum<["cloudflare", "docker", "vercel", "custom"]>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    platform: "cloudflare" | "docker" | "vercel" | "custom";
    config?: Record<string, unknown> | undefined;
}, {
    projectId: string;
    platform: "cloudflare" | "docker" | "vercel" | "custom";
    config?: Record<string, unknown> | undefined;
}>;
//# sourceMappingURL=project.d.ts.map