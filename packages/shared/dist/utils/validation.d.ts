import { z } from 'zod';
export declare function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T;
export declare function sanitizeString(input: string): string;
export declare function sanitizeObject<T extends Record<string, unknown>>(obj: T): T;
export declare class ValidationError extends Error {
    readonly errors: z.ZodIssue[];
    constructor(message: string, errors: z.ZodIssue[]);
}
//# sourceMappingURL=validation.d.ts.map