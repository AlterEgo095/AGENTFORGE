import { z } from 'zod';
export const UserTierSchema = z.enum(['free', 'pro', 'enterprise']);
export const LoginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});
export const RegisterSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email format'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
});
export const UpdateUserSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    preferences: z.object({
        theme: z.enum(['light', 'dark', 'system']).optional(),
        language: z.enum(['en', 'fr', 'es', 'de']).optional(),
    }).optional(),
});
export const AuthTokensSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number().positive(),
});
//# sourceMappingURL=user.js.map