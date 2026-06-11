import { z } from 'zod';
export declare const AgentIdSchema: z.ZodEnum<["DEV", "SLIDES", "DOC", "DATA", "RECHERCHE", "EMAIL", "MARKETING"]>;
export declare const LLMProviderSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    model: z.ZodString;
    maxTokens: z.ZodNumber;
    temperature: z.ZodNumber;
    costPer1kTokens: z.ZodNumber;
    latencyMs: z.ZodNumber;
    strengths: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    model: string;
    maxTokens: number;
    temperature: number;
    costPer1kTokens: number;
    latencyMs: number;
    strengths: string[];
}, {
    id: string;
    name: string;
    model: string;
    maxTokens: number;
    temperature: number;
    costPer1kTokens: number;
    latencyMs: number;
    strengths: string[];
}>;
export declare const LLMPoolConfigSchema: z.ZodObject<{
    primary: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        model: z.ZodString;
        maxTokens: z.ZodNumber;
        temperature: z.ZodNumber;
        costPer1kTokens: z.ZodNumber;
        latencyMs: z.ZodNumber;
        strengths: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }, {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }>, "many">;
    secondary: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        model: z.ZodString;
        maxTokens: z.ZodNumber;
        temperature: z.ZodNumber;
        costPer1kTokens: z.ZodNumber;
        latencyMs: z.ZodNumber;
        strengths: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }, {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }>, "many">;
    fallback: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        model: z.ZodString;
        maxTokens: z.ZodNumber;
        temperature: z.ZodNumber;
        costPer1kTokens: z.ZodNumber;
        latencyMs: z.ZodNumber;
        strengths: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }, {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    primary: {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }[];
    secondary: {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }[];
    fallback: {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }[];
}, {
    primary: {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }[];
    secondary: {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }[];
    fallback: {
        id: string;
        name: string;
        model: string;
        maxTokens: number;
        temperature: number;
        costPer1kTokens: number;
        latencyMs: number;
        strengths: string[];
    }[];
}>;
export declare const ReflectionCriteriaSchema: z.ZodObject<{
    name: z.ZodString;
    weight: z.ZodNumber;
    description: z.ZodString;
    scoringGuide: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    weight: number;
    description: string;
    scoringGuide: string;
}, {
    name: string;
    weight: number;
    description: string;
    scoringGuide: string;
}>;
export declare const OutputFormatSchema: z.ZodObject<{
    type: z.ZodEnum<["code", "slides", "document", "data", "report", "email", "campaign"]>;
    extensions: z.ZodArray<z.ZodString, "many">;
    mimeType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "code" | "slides" | "document" | "data" | "report" | "email" | "campaign";
    extensions: string[];
    mimeType: string;
}, {
    type: "code" | "slides" | "document" | "data" | "report" | "email" | "campaign";
    extensions: string[];
    mimeType: string;
}>;
export declare const DAGNodeSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    level: z.ZodNumber;
    type: z.ZodEnum<["input", "process", "output"]>;
    agentRole: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "input" | "process" | "output";
    label: string;
    level: number;
    agentRole: string;
}, {
    id: string;
    type: "input" | "process" | "output";
    label: string;
    level: number;
    agentRole: string;
}>;
export declare const DAGEdgeSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    condition: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
    condition?: string | undefined;
}, {
    from: string;
    to: string;
    condition?: string | undefined;
}>;
export declare const DAGTemplateSchema: z.ZodObject<{
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        level: z.ZodNumber;
        type: z.ZodEnum<["input", "process", "output"]>;
        agentRole: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: "input" | "process" | "output";
        label: string;
        level: number;
        agentRole: string;
    }, {
        id: string;
        type: "input" | "process" | "output";
        label: string;
        level: number;
        agentRole: string;
    }>, "many">;
    edges: z.ZodArray<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        condition: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        from: string;
        to: string;
        condition?: string | undefined;
    }, {
        from: string;
        to: string;
        condition?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    nodes: {
        id: string;
        type: "input" | "process" | "output";
        label: string;
        level: number;
        agentRole: string;
    }[];
    edges: {
        from: string;
        to: string;
        condition?: string | undefined;
    }[];
}, {
    nodes: {
        id: string;
        type: "input" | "process" | "output";
        label: string;
        level: number;
        agentRole: string;
    }[];
    edges: {
        from: string;
        to: string;
        condition?: string | undefined;
    }[];
}>;
export declare const RateLimitConfigSchema: z.ZodObject<{
    windowMs: z.ZodNumber;
    maxRequests: z.ZodNumber;
    tier: z.ZodEnum<["free", "pro", "enterprise"]>;
}, "strip", z.ZodTypeAny, {
    windowMs: number;
    maxRequests: number;
    tier: "free" | "pro" | "enterprise";
}, {
    windowMs: number;
    maxRequests: number;
    tier: "free" | "pro" | "enterprise";
}>;
export declare const AgentConfigSchema: z.ZodObject<{
    id: z.ZodEnum<["DEV", "SLIDES", "DOC", "DATA", "RECHERCHE", "EMAIL", "MARKETING"]>;
    name: z.ZodString;
    description: z.ZodString;
    icon: z.ZodString;
    color: z.ZodString;
    systemPrompt: z.ZodString;
    llmPool: z.ZodObject<{
        primary: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            model: z.ZodString;
            maxTokens: z.ZodNumber;
            temperature: z.ZodNumber;
            costPer1kTokens: z.ZodNumber;
            latencyMs: z.ZodNumber;
            strengths: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }, {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }>, "many">;
        secondary: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            model: z.ZodString;
            maxTokens: z.ZodNumber;
            temperature: z.ZodNumber;
            costPer1kTokens: z.ZodNumber;
            latencyMs: z.ZodNumber;
            strengths: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }, {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }>, "many">;
        fallback: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            model: z.ZodString;
            maxTokens: z.ZodNumber;
            temperature: z.ZodNumber;
            costPer1kTokens: z.ZodNumber;
            latencyMs: z.ZodNumber;
            strengths: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }, {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        primary: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
        secondary: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
        fallback: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
    }, {
        primary: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
        secondary: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
        fallback: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
    }>;
    reflectionCriteria: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        weight: z.ZodNumber;
        description: z.ZodString;
        scoringGuide: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        weight: number;
        description: string;
        scoringGuide: string;
    }, {
        name: string;
        weight: number;
        description: string;
        scoringGuide: string;
    }>, "many">;
    maxIterations: z.ZodNumber;
    confidenceThreshold: z.ZodNumber;
    sandboxEnabled: z.ZodBoolean;
    deploymentTarget: z.ZodEnum<["cloudflare", "docker", "none"]>;
    outputFormat: z.ZodObject<{
        type: z.ZodEnum<["code", "slides", "document", "data", "report", "email", "campaign"]>;
        extensions: z.ZodArray<z.ZodString, "many">;
        mimeType: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "code" | "slides" | "document" | "data" | "report" | "email" | "campaign";
        extensions: string[];
        mimeType: string;
    }, {
        type: "code" | "slides" | "document" | "data" | "report" | "email" | "campaign";
        extensions: string[];
        mimeType: string;
    }>;
    dagTemplate: z.ZodObject<{
        nodes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            level: z.ZodNumber;
            type: z.ZodEnum<["input", "process", "output"]>;
            agentRole: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            type: "input" | "process" | "output";
            label: string;
            level: number;
            agentRole: string;
        }, {
            id: string;
            type: "input" | "process" | "output";
            label: string;
            level: number;
            agentRole: string;
        }>, "many">;
        edges: z.ZodArray<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            condition: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            from: string;
            to: string;
            condition?: string | undefined;
        }, {
            from: string;
            to: string;
            condition?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        nodes: {
            id: string;
            type: "input" | "process" | "output";
            label: string;
            level: number;
            agentRole: string;
        }[];
        edges: {
            from: string;
            to: string;
            condition?: string | undefined;
        }[];
    }, {
        nodes: {
            id: string;
            type: "input" | "process" | "output";
            label: string;
            level: number;
            agentRole: string;
        }[];
        edges: {
            from: string;
            to: string;
            condition?: string | undefined;
        }[];
    }>;
    rateLimit: z.ZodObject<{
        windowMs: z.ZodNumber;
        maxRequests: z.ZodNumber;
        tier: z.ZodEnum<["free", "pro", "enterprise"]>;
    }, "strip", z.ZodTypeAny, {
        windowMs: number;
        maxRequests: number;
        tier: "free" | "pro" | "enterprise";
    }, {
        windowMs: number;
        maxRequests: number;
        tier: "free" | "pro" | "enterprise";
    }>;
}, "strip", z.ZodTypeAny, {
    id: "DEV" | "SLIDES" | "DOC" | "DATA" | "RECHERCHE" | "EMAIL" | "MARKETING";
    name: string;
    description: string;
    icon: string;
    color: string;
    systemPrompt: string;
    llmPool: {
        primary: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
        secondary: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
        fallback: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
    };
    reflectionCriteria: {
        name: string;
        weight: number;
        description: string;
        scoringGuide: string;
    }[];
    maxIterations: number;
    confidenceThreshold: number;
    sandboxEnabled: boolean;
    deploymentTarget: "cloudflare" | "docker" | "none";
    outputFormat: {
        type: "code" | "slides" | "document" | "data" | "report" | "email" | "campaign";
        extensions: string[];
        mimeType: string;
    };
    dagTemplate: {
        nodes: {
            id: string;
            type: "input" | "process" | "output";
            label: string;
            level: number;
            agentRole: string;
        }[];
        edges: {
            from: string;
            to: string;
            condition?: string | undefined;
        }[];
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        tier: "free" | "pro" | "enterprise";
    };
}, {
    id: "DEV" | "SLIDES" | "DOC" | "DATA" | "RECHERCHE" | "EMAIL" | "MARKETING";
    name: string;
    description: string;
    icon: string;
    color: string;
    systemPrompt: string;
    llmPool: {
        primary: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
        secondary: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
        fallback: {
            id: string;
            name: string;
            model: string;
            maxTokens: number;
            temperature: number;
            costPer1kTokens: number;
            latencyMs: number;
            strengths: string[];
        }[];
    };
    reflectionCriteria: {
        name: string;
        weight: number;
        description: string;
        scoringGuide: string;
    }[];
    maxIterations: number;
    confidenceThreshold: number;
    sandboxEnabled: boolean;
    deploymentTarget: "cloudflare" | "docker" | "none";
    outputFormat: {
        type: "code" | "slides" | "document" | "data" | "report" | "email" | "campaign";
        extensions: string[];
        mimeType: string;
    };
    dagTemplate: {
        nodes: {
            id: string;
            type: "input" | "process" | "output";
            label: string;
            level: number;
            agentRole: string;
        }[];
        edges: {
            from: string;
            to: string;
            condition?: string | undefined;
        }[];
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        tier: "free" | "pro" | "enterprise";
    };
}>;
export declare const ExecutionStatusSchema: z.ZodEnum<["queued", "running", "reflecting", "fixing", "completed", "completed_with_warnings", "failed", "cancelled"]>;
export declare const AgentExecutionSchema: z.ZodObject<{
    id: z.ZodString;
    agentId: z.ZodEnum<["DEV", "SLIDES", "DOC", "DATA", "RECHERCHE", "EMAIL", "MARKETING"]>;
    userId: z.ZodString;
    projectId: z.ZodString;
    status: z.ZodEnum<["queued", "running", "reflecting", "fixing", "completed", "completed_with_warnings", "failed", "cancelled"]>;
    input: z.ZodString;
    output: z.ZodOptional<z.ZodString>;
    iterations: z.ZodNumber;
    totalTokensUsed: z.ZodNumber;
    totalCost: z.ZodNumber;
    createdAt: z.ZodDate;
    completedAt: z.ZodOptional<z.ZodDate>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    input: string;
    id: string;
    status: "queued" | "running" | "reflecting" | "fixing" | "completed" | "completed_with_warnings" | "failed" | "cancelled";
    agentId: "DEV" | "SLIDES" | "DOC" | "DATA" | "RECHERCHE" | "EMAIL" | "MARKETING";
    userId: string;
    projectId: string;
    iterations: number;
    totalTokensUsed: number;
    totalCost: number;
    createdAt: Date;
    output?: string | undefined;
    completedAt?: Date | undefined;
    error?: string | undefined;
}, {
    input: string;
    id: string;
    status: "queued" | "running" | "reflecting" | "fixing" | "completed" | "completed_with_warnings" | "failed" | "cancelled";
    agentId: "DEV" | "SLIDES" | "DOC" | "DATA" | "RECHERCHE" | "EMAIL" | "MARKETING";
    userId: string;
    projectId: string;
    iterations: number;
    totalTokensUsed: number;
    totalCost: number;
    createdAt: Date;
    output?: string | undefined;
    completedAt?: Date | undefined;
    error?: string | undefined;
}>;
//# sourceMappingURL=agent.d.ts.map