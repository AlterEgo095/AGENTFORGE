import { z } from 'zod';
export declare const UserTierSchema: z.ZodEnum<["free", "pro", "enterprise"]>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const RegisterSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    password: string;
}, {
    email: string;
    name: string;
    password: string;
}>;
export declare const UpdateUserSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    preferences: z.ZodOptional<z.ZodObject<{
        theme: z.ZodOptional<z.ZodEnum<["light", "dark", "system"]>>;
        language: z.ZodOptional<z.ZodEnum<["en", "fr", "es", "de"]>>;
    }, "strip", z.ZodTypeAny, {
        theme?: "system" | "light" | "dark" | undefined;
        language?: "en" | "fr" | "es" | "de" | undefined;
    }, {
        theme?: "system" | "light" | "dark" | undefined;
        language?: "en" | "fr" | "es" | "de" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    preferences?: {
        theme?: "system" | "light" | "dark" | undefined;
        language?: "en" | "fr" | "es" | "de" | undefined;
    } | undefined;
}, {
    name?: string | undefined;
    preferences?: {
        theme?: "system" | "light" | "dark" | undefined;
        language?: "en" | "fr" | "es" | "de" | undefined;
    } | undefined;
}>;
export declare const AuthTokensSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    expiresIn: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}, {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}>;
//# sourceMappingURL=user.d.ts.map