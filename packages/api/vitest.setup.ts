// ============================================================
// AgentForge - API Vitest Setup
// Global test setup: environment variables, mocks
// ============================================================

import { vi } from 'vitest';

// Set test environment variables before any module imports
vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('PORT', '3001');
vi.stubEnv('DATABASE_URL', 'postgresql://agentforge:agentforge@localhost:5432/agentforge_test');
vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
vi.stubEnv('JWT_SECRET', 'test-jwt-secret-key-for-testing-minimum-32-characters-long');
vi.stubEnv('JWT_ACCESS_EXPIRY', '15m');
vi.stubEnv('JWT_REFRESH_EXPIRY', '7d');
vi.stubEnv('JWT_ISSUER', 'agentforge');
vi.stubEnv('JWT_AUDIENCE', 'agentforge-api');
vi.stubEnv('MFA_ENCRYPTION_KEY', 'test-mfa-encryption-key-for-testing-minimum-32-characters');
vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
vi.stubEnv('GOOGLE_API_KEY', 'test-google-key');
vi.stubEnv('DEEPSEEK_API_KEY', 'test-deepseek-key');
vi.stubEnv('FORCE_HTTPS', 'false');
vi.stubEnv('TRUST_PROXY', 'false');
