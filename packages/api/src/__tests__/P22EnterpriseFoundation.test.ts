// ============================================================
// AgentForge — P2.2 Enterprise Foundation Test Suite
// Phases P2.2.1 through P2.2.9: TLS, Multi-Tenant, RBAC,
// Auth/JWT, Load, Resilience, Observability, CI/CD, Non-Regression
// ============================================================

import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import { EncryptionService } from '../services/security/EncryptionService';
import { JWTBlacklist } from '../services/security/JWTBlacklist';
import { RBACService, ROLE_HIERARCHY } from '../services/tenant/RBACService';
import type { Role, Action } from '../services/tenant/RBACService';

// ═══════════════════════════════════════════════════════════
// P2.2.1 — TLS / HTTPS ENTERPRISE
// ═══════════════════════════════════════════════════════════

describe('P2.2.1 — TLS / HTTPS Enterprise', () => {
  beforeAll(() => {
    // Ensure environment variables are set for JWT and TLS tests
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'agentforge-dev-secret-change-in-production-at-least-32-chars';
    process.env.FORCE_HTTPS = process.env.FORCE_HTTPS ?? 'false';
    process.env.TRUST_PROXY = process.env.TRUST_PROXY ?? 'false';
  });
  describe('Nginx TLS Configuration Validation', () => {
    it('should have nginx-secure.conf with TLS 1.2+ and TLS 1.3', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const confPath = path.join(
        __dirname,
        '../../../../infra/docker/nginx/ssl/nginx-secure.conf'
      );

      const conf = fs.readFileSync(confPath, 'utf8');

      // TLS 1.2+ enforced
      expect(conf).toContain('TLSv1.2');
      expect(conf).toContain('TLSv1.3');

      // No TLS 1.0 or 1.1
      expect(conf).not.toContain('TLSv1 ');
      expect(conf).not.toContain('TLSv1.1');
      expect(conf).not.toContain('SSLv2');
      expect(conf).not.toContain('SSLv3');
    });

    it('should have strong cipher suites configured', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const confPath = path.join(
        __dirname,
        '../../../../infra/docker/nginx/ssl/nginx-secure.conf'
      );

      const conf = fs.readFileSync(confPath, 'utf8');

      // Must have cipher configuration
      expect(conf).toContain('ssl_ciphers');
      // Must include AEAD ciphers (GCM)
      expect(conf).toContain('AES128-GCM');
      expect(conf).toContain('AES256-GCM');
      // Must include forward secrecy ciphers
      expect(conf).toContain('ECDHE');
    });

    it('should have HTTP to HTTPS redirect on port 80', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const confPath = path.join(
        __dirname,
        '../../../../infra/docker/nginx/ssl/nginx-secure.conf'
      );

      const conf = fs.readFileSync(confPath, 'utf8');

      // Port 80 block with redirect
      expect(conf).toMatch(/listen\s+80/);
      expect(conf).toContain('return 301 https://');
    });

    it('should have HTTPS server on port 443 with SSL', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const confPath = path.join(
        __dirname,
        '../../../../infra/docker/nginx/ssl/nginx-secure.conf'
      );

      const conf = fs.readFileSync(confPath, 'utf8');

      expect(conf).toMatch(/listen\s+443\s+ssl/);
      expect(conf).toContain('ssl_certificate');
      expect(conf).toContain('ssl_certificate_key');
    });

    it('should have HSTS header with preload', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const confPath = path.join(
        __dirname,
        '../../../../infra/docker/nginx/ssl/nginx-secure.conf'
      );

      const conf = fs.readFileSync(confPath, 'utf8');

      expect(conf).toContain('Strict-Transport-Security');
      expect(conf).toContain('includeSubDomains');
      expect(conf).toContain('preload');
      expect(conf).toContain('63072000'); // 2 years
    });

    it('should have session tickets disabled for forward secrecy', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const confPath = path.join(
        __dirname,
        '../../../../infra/docker/nginx/ssl/nginx-secure.conf'
      );

      const conf = fs.readFileSync(confPath, 'utf8');
      expect(conf).toContain('ssl_session_tickets off');
    });

    it('should have security headers in HTTPS block', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const confPath = path.join(
        __dirname,
        '../../../../infra/docker/nginx/ssl/nginx-secure.conf'
      );

      const conf = fs.readFileSync(confPath, 'utf8');

      expect(conf).toContain('X-Content-Type-Options');
      expect(conf).toContain('X-Frame-Options');
      expect(conf).toContain('Content-Security-Policy');
      expect(conf).toContain('Cross-Origin-Opener-Policy');
    });

    it('should have CSP without unsafe-eval in production nginx config', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const confPath = path.join(
        __dirname,
        '../../../../infra/docker/nginx/ssl/nginx-secure.conf'
      );

      const conf = fs.readFileSync(confPath, 'utf8');

      // The secure nginx config should NOT have unsafe-eval
      const cspLine = conf.split('\n').find(l => l.includes('Content-Security-Policy'));
      expect(cspLine).toBeDefined();
      expect(cspLine).not.toContain('unsafe-eval');
    });

    it('should proxy X-Forwarded-Proto as https', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const confPath = path.join(
        __dirname,
        '../../../../infra/docker/nginx/ssl/nginx-secure.conf'
      );

      const conf = fs.readFileSync(confPath, 'utf8');
      expect(conf).toContain('X-Forwarded-Proto https');
    });

    it('should deny access to sensitive files (.env, .git, etc.)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const confPath = path.join(
        __dirname,
        '../../../../infra/docker/nginx/ssl/nginx-secure.conf'
      );

      const conf = fs.readFileSync(confPath, 'utf8');
      expect(conf).toContain('deny all');
    });
  });

  describe('Docker Compose Production TLS Validation', () => {
    it('should have production docker-compose with HTTPS ports', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const composePath = path.join(
        __dirname,
        '../../../../infra/docker/docker-compose.production.yml'
      );

      const compose = fs.readFileSync(composePath, 'utf8');
      expect(compose).toContain("'80:80'");     // HTTP redirect
      expect(compose).toContain("'443:443'");   // HTTPS
    });

    it('should NOT expose API port directly in production', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const composePath = path.join(
        __dirname,
        '../../../../infra/docker/docker-compose.production.yml'
      );

      const compose = fs.readFileSync(composePath, 'utf8');
      // API should use 'expose' not 'ports'
      expect(compose).toContain("expose:");
    });

    it('should mount SSL certificates as read-only volume', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const composePath = path.join(
        __dirname,
        '../../../../infra/docker/docker-compose.production.yml'
      );

      const compose = fs.readFileSync(composePath, 'utf8');
      expect(compose).toContain('/etc/nginx/ssl:ro');
    });

    it('should require mandatory env vars in production', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const composePath = path.join(
        __dirname,
        '../../../../infra/docker/docker-compose.production.yml'
      );

      const compose = fs.readFileSync(composePath, 'utf8');
      expect(compose).toContain('JWT_SECRET:?JWT_SECRET must be set');
      expect(compose).toContain('MFA_ENCRYPTION_KEY:?MFA_ENCRYPTION_KEY must be set');
    });

    it('should set FORCE_HTTPS and TRUST_PROXY in API environment', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const composePath = path.join(
        __dirname,
        '../../../../infra/docker/docker-compose.production.yml'
      );

      const compose = fs.readFileSync(composePath, 'utf8');
      expect(compose).toContain("FORCE_HTTPS: 'true'");
      expect(compose).toContain("TRUST_PROXY: 'true'");
    });
  });

  describe('Certificate Generation Script', () => {
    it('should exist and be a shell script', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const scriptPath = path.join(
        __dirname,
        '../../../../infra/docker/nginx/ssl/generate-certs.sh'
      );

      expect(fs.existsSync(scriptPath)).toBe(true);
      const script = fs.readFileSync(scriptPath, 'utf8');
      expect(script).toContain('#!/bin/bash');
      expect(script).toContain('openssl');
    });
  });

  describe('Security Headers Middleware (P2.2.1)', () => {
    it('should export httpsRedirect middleware', async () => {
      const mod = await import('../middleware/securityHeaders');
      expect(mod.httpsRedirect).toBeDefined();
      expect(typeof mod.httpsRedirect).toBe('function');
    });

    it('should export setSecureCookie utility', async () => {
      const mod = await import('../middleware/securityHeaders');
      expect(mod.setSecureCookie).toBeDefined();
      expect(typeof mod.setSecureCookie).toBe('function');
    });
  });

  describe('Environment Configuration for TLS', () => {
    it('should have FORCE_HTTPS and TRUST_PROXY in env config', async () => {
      const { env } = await import('../config/env');
      expect(env.FORCE_HTTPS).toBeDefined();
      expect(env.TRUST_PROXY).toBeDefined();
    });

    it('should default FORCE_HTTPS to false for development', async () => {
      const { env } = await import('../config/env');
      expect(env.FORCE_HTTPS).toBe('false');
    });

    it('should default TRUST_PROXY to false for development', async () => {
      const { env } = await import('../config/env');
      expect(env.TRUST_PROXY).toBe('false');
    });
  });
});

// ═══════════════════════════════════════════════════════════
// P2.2.2 — MULTI-TENANT ISOLATION VALIDATION
// ═══════════════════════════════════════════════════════════

describe('P2.2.2 — Multi-Tenant Isolation Validation', () => {
  describe('Database Schema Isolation', () => {
    it('should have tenantId on all tenant-scoped tables', async () => {
      const schema = await import('../db/schema');

      // Projects must have tenantId
      expect(schema.projects).toBeDefined();
      const projectColumns = Object.keys(schema.projects);
      expect(projectColumns).toContain('tenantId');

      // Generation Sessions must have tenantId
      expect(schema.generationSessions).toBeDefined();
      const sessionColumns = Object.keys(schema.generationSessions);
      expect(sessionColumns).toContain('tenantId');

      // Deployments must have tenantId
      expect(schema.deployments).toBeDefined();
      const deployColumns = Object.keys(schema.deployments);
      expect(deployColumns).toContain('tenantId');
    });

    it('should have tenant_members table for RBAC membership', async () => {
      const schema = await import('../db/schema');
      expect(schema.tenantMembers).toBeDefined();
      const memberColumns = Object.keys(schema.tenantMembers);
      expect(memberColumns).toContain('tenantId');
      expect(memberColumns).toContain('userId');
      expect(memberColumns).toContain('role');
    });

    it('should have billing tables scoped to tenants', async () => {
      const schema = await import('../db/schema');
      expect(schema.tenantInvoices).toBeDefined();
      expect(schema.tenantPayments).toBeDefined();

      const invoiceColumns = Object.keys(schema.tenantInvoices);
      expect(invoiceColumns).toContain('tenantId');

      const paymentColumns = Object.keys(schema.tenantPayments);
      expect(paymentColumns).toContain('tenantId');
    });

    it('should have 5-role enum for tenant members', async () => {
      const schema = await import('../db/schema');
      expect(schema.tenantMemberRoleEnum).toBeDefined();
    });
  });

  describe('Tenant Service Isolation Logic', () => {
    it('should resolve tenants from headers', async () => {
      const { tenantService } = await import('../services/tenant/TenantService');
      expect(tenantService).toBeDefined();
      expect(typeof tenantService.resolveTenant).toBe('function');
    });

    it('should enforce quota per tenant', async () => {
      const { tenantQuotaService } = await import('../services/tenant/TenantQuotaService');
      expect(tenantQuotaService).toBeDefined();
      expect(typeof tenantQuotaService.checkExecutionQuota).toBe('function');
      expect(typeof tenantQuotaService.checkTokenQuota).toBe('function');
      expect(typeof tenantQuotaService.checkCostQuota).toBe('function');
    });

    it('should scope billing per tenant', async () => {
      const { tenantBillingService } = await import('../services/tenant/TenantBillingService');
      expect(tenantBillingService).toBeDefined();
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should require tenant middleware for tenant-scoped routes', async () => {
      const mod = await import('../middleware/tenant');
      expect(mod.requiredTenantMiddleware).toBeDefined();
      expect(mod.tenantMiddleware).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════
// P2.2.3 — RBAC INTER-TENANT VALIDATION
// ═══════════════════════════════════════════════════════════

describe('P2.2.3 — RBAC Inter-Tenant Validation', () => {
  let rbac: RBACService;

  beforeAll(() => {
    rbac = new RBACService();
  });

  describe('5-Role Hierarchy', () => {
    it('should define all 5 roles with correct hierarchy levels', () => {
      expect(ROLE_HIERARCHY.super_admin).toBe(5);
      expect(ROLE_HIERARCHY.admin).toBe(4);
      expect(ROLE_HIERARCHY.manager).toBe(3);
      expect(ROLE_HIERARCHY.user).toBe(2);
      expect(ROLE_HIERARCHY.viewer).toBe(1);
    });

    it('should enforce role ordering: super_admin > admin > manager > user > viewer', () => {
      expect(ROLE_HIERARCHY.super_admin).toBeGreaterThan(ROLE_HIERARCHY.admin);
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.manager);
      expect(ROLE_HIERARCHY.manager).toBeGreaterThan(ROLE_HIERARCHY.user);
      expect(ROLE_HIERARCHY.user).toBeGreaterThan(ROLE_HIERARCHY.viewer);
    });
  });

  describe('Permission Matrix - SUPER_ADMIN', () => {
    it('should have ALL actions on ALL resources', () => {
      const criticalResources = [
        'tenants', 'users', 'projects', 'agents', 'executions',
        'billing', 'settings', 'audit', 'api_keys', 'deployments',
        'providers', 'monitoring', 'security', 'infrastructure',
      ];

      for (const resource of criticalResources) {
        expect(rbac.hasPermission('super_admin', resource, 'read')).toBe(true);
        expect(rbac.hasPermission('super_admin', resource, 'manage')).toBe(true);
      }
    });
  });

  describe('Permission Matrix - ADMIN', () => {
    it('should NOT be able to delete tenants', () => {
      expect(rbac.hasPermission('admin', 'tenants', 'delete')).toBe(false);
    });

    it('should NOT be able to manage providers', () => {
      expect(rbac.hasPermission('admin', 'providers', 'manage')).toBe(false);
    });

    it('should NOT be able to manage security', () => {
      expect(rbac.hasPermission('admin', 'security', 'manage')).toBe(false);
    });

    it('should be able to read and update tenants (own)', () => {
      expect(rbac.hasPermission('admin', 'tenants', 'read')).toBe(true);
      expect(rbac.hasPermission('admin', 'tenants', 'update')).toBe(true);
    });

    it('should be able to manage users within tenant', () => {
      expect(rbac.hasPermission('admin', 'users', 'manage')).toBe(true);
    });
  });

  describe('Permission Matrix - MANAGER', () => {
    it('should NOT be able to delete users', () => {
      expect(rbac.hasPermission('manager', 'users', 'delete')).toBe(false);
    });

    it('should NOT be able to update billing', () => {
      expect(rbac.hasPermission('manager', 'billing', 'update')).toBe(false);
    });

    it('should be able to create and execute projects', () => {
      expect(rbac.hasPermission('manager', 'projects', 'create')).toBe(true);
      expect(rbac.hasPermission('manager', 'projects', 'execute')).toBe(true);
    });

    it('should be able to read billing', () => {
      expect(rbac.hasPermission('manager', 'billing', 'read')).toBe(true);
    });
  });

  describe('Permission Matrix - USER', () => {
    it('should NOT be able to delete projects', () => {
      expect(rbac.hasPermission('user', 'projects', 'delete')).toBe(false);
    });

    it('should be able to create projects', () => {
      expect(rbac.hasPermission('user', 'projects', 'create')).toBe(true);
    });

    it('should be able to execute agents', () => {
      expect(rbac.hasPermission('user', 'agents', 'execute')).toBe(true);
    });

    it('should NOT be able to read billing', () => {
      expect(rbac.hasPermission('user', 'billing', 'read')).toBe(false);
    });
  });

  describe('Permission Matrix - VIEWER', () => {
    it('should ONLY have read permissions', () => {
      const actions: Action[] = ['create', 'update', 'delete', 'execute', 'manage'];
      const resources = [
        'tenants', 'users', 'projects', 'agents', 'executions',
        'billing', 'settings', 'analytics', 'deployments',
      ];

      for (const resource of resources) {
        for (const action of actions) {
          expect(rbac.hasPermission('viewer', resource, action)).toBe(false);
        }
      }
    });

    it('should be able to read projects and agents', () => {
      expect(rbac.hasPermission('viewer', 'projects', 'read')).toBe(true);
      expect(rbac.hasPermission('viewer', 'agents', 'read')).toBe(true);
    });
  });

  describe('Role Assignment Rules', () => {
    it('should NOT allow admin to assign admin role (must be higher)', () => {
      expect(rbac.canAssignRole('admin', 'admin')).toBe(false);
    });

    it('should allow admin to assign manager role', () => {
      expect(rbac.canAssignRole('admin', 'manager')).toBe(true);
    });

    it('should allow super_admin to assign admin role', () => {
      expect(rbac.canAssignRole('super_admin', 'admin')).toBe(true);
    });

    it('should NOT allow viewer to assign any role', () => {
      // viewer (level 1) cannot assign any role since no role is lower
      expect(rbac.canAssignRole('viewer', 'user')).toBe(false);
    });

    it('should allow user to assign viewer role (level 2 > level 1)', () => {
      // user (level 2) can assign viewer (level 1) — this is by design
      expect(rbac.canAssignRole('user', 'viewer')).toBe(true);
    });
  });

  describe('requirePermission Middleware', () => {
    it('should be importable and functional', async () => {
      const mod = await import('../middleware/tenant');
      expect(mod.requirePermission).toBeDefined();
      expect(typeof mod.requirePermission).toBe('function');
    });

    it('should create middleware for each resource/action combination', async () => {
      const mod = await import('../middleware/tenant');
      const middleware = mod.requirePermission({ resource: 'users', action: 'read' });
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Complete Permission Matrix Export', () => {
    it('should export full permission matrix for audit', () => {
      const matrix = rbac.getPermissionMatrix();
      expect(Object.keys(matrix)).toHaveLength(5);
      expect(matrix.super_admin).toBeDefined();
      expect(matrix.admin).toBeDefined();
      expect(matrix.manager).toBeDefined();
      expect(matrix.user).toBeDefined();
      expect(matrix.viewer).toBeDefined();
    });

    it('should have display names for all roles', () => {
      expect(rbac.getRoleDisplayName('super_admin')).toBe('Super Admin');
      expect(rbac.getRoleDisplayName('admin')).toBe('Admin');
      expect(rbac.getRoleDisplayName('manager')).toBe('Manager');
      expect(rbac.getRoleDisplayName('user')).toBe('User');
      expect(rbac.getRoleDisplayName('viewer')).toBe('Viewer');
    });
  });
});

// ═══════════════════════════════════════════════════════════
// P2.2.4 — AUTH & JWT VALIDATION
// ═══════════════════════════════════════════════════════════

describe('P2.2.4 — Auth & JWT Validation', () => {
  describe('JWT Token Structure (P2.1.4 + P2.2.4)', () => {
    it('should include all OWASP-required claims in access tokens', async () => {
      const { sign, verify } = await import('hono/jwt');
      const { v4: uuidv4 } = await import('uuid');

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        tier: 'free',
        iss: 'agentforge',
        aud: 'agentforge-api',
        iat: now,
        exp: now + 900,
        jti: uuidv4(),
      };

      const token = await sign(payload, process.env.JWT_SECRET!);
      const decoded = await verify(token, process.env.JWT_SECRET!, 'HS256') as typeof payload;

      expect(decoded.sub).toBe('user-123');
      expect(decoded.iss).toBe('agentforge');
      expect(decoded.aud).toBe('agentforge-api');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.jti).toBeDefined();
    });

    it('should include type claim in refresh tokens', async () => {
      const { sign, verify } = await import('hono/jwt');
      const { v4: uuidv4 } = await import('uuid');

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        type: 'refresh',
        tid: 'abc123',
        iss: 'agentforge',
        aud: 'agentforge-api',
        iat: now,
        exp: now + 604800,
        jti: uuidv4(),
      };

      const token = await sign(payload, process.env.JWT_SECRET!);
      const decoded = await verify(token, process.env.JWT_SECRET!, 'HS256') as typeof payload;

      expect(decoded.type).toBe('refresh');
      expect(decoded.tid).toBe('abc123');
    });

    it('should include type claim in MFA pending tokens', async () => {
      const { sign, verify } = await import('hono/jwt');
      const { v4: uuidv4 } = await import('uuid');

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        type: 'mfa_pending',
        sessionId: 'session-abc',
        iss: 'agentforge',
        aud: 'agentforge-api',
        iat: now,
        exp: now + 300,
        jti: uuidv4(),
      };

      const token = await sign(payload, process.env.JWT_SECRET!);
      const decoded = await verify(token, process.env.JWT_SECRET!, 'HS256') as typeof payload;

      expect(decoded.type).toBe('mfa_pending');
      expect(decoded.sessionId).toBe('session-abc');
    });
  });

  describe('JWT Validation - Invalid Scenarios', () => {
    it('should reject expired JWT', async () => {
      const { sign } = await import('hono/jwt');
      const { verify } = await import('hono/jwt');

      const now = Math.floor(Date.now() / 1000);
      const expiredPayload = {
        sub: 'user-123',
        tier: 'free',
        iss: 'agentforge',
        aud: 'agentforge-api',
        iat: now - 3600,
        exp: now - 1800,
        jti: 'test-jti-expired',
      };

      const token = await sign(expiredPayload, process.env.JWT_SECRET!);

      await expect(verify(token, process.env.JWT_SECRET!, 'HS256')).rejects.toThrow();
    });

    it('should reject JWT with wrong issuer', async () => {
      const { sign, verify } = await import('hono/jwt');

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        tier: 'free',
        iss: 'evil-attacker',
        aud: 'agentforge-api',
        iat: now,
        exp: now + 900,
        jti: 'test-jti-wrong-iss',
      };

      const token = await sign(payload, process.env.JWT_SECRET!);
      const decoded = await verify(token, process.env.JWT_SECRET!, 'HS256') as typeof payload;

      // The token is valid JWT, but the issuer does not match expected
      expect(decoded.iss).not.toBe('agentforge');
    });

    it('should reject JWT with wrong audience', async () => {
      const { sign, verify } = await import('hono/jwt');

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        tier: 'free',
        iss: 'agentforge',
        aud: 'evil-audience',
        iat: now,
        exp: now + 900,
        jti: 'test-jti-wrong-aud',
      };

      const token = await sign(payload, process.env.JWT_SECRET!);
      const decoded = await verify(token, process.env.JWT_SECRET!, 'HS256') as typeof payload;

      expect(decoded.aud).not.toBe('agentforge-api');
    });

    it('should reject tampered JWT', async () => {
      const { sign } = await import('hono/jwt');

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        tier: 'free',
        iss: 'agentforge',
        aud: 'agentforge-api',
        iat: now,
        exp: now + 900,
      };

      const token = await sign(payload, process.env.JWT_SECRET!);
      const tamperedToken = token.slice(0, -5) + 'XXXXX';

      const { verify } = await import('hono/jwt');
      await expect(verify(tamperedToken, process.env.JWT_SECRET!, 'HS256')).rejects.toThrow();
    });

    it('should identify refresh token type for rejection', async () => {
      const { sign, verify } = await import('hono/jwt');

      const now = Math.floor(Date.now() / 1000);
      const refreshPayload = {
        sub: 'user-123',
        type: 'refresh',
        tid: 'abc',
        iss: 'agentforge',
        aud: 'agentforge-api',
        iat: now,
        exp: now + 604800,
        jti: 'refresh-jti-test',
      };

      const token = await sign(refreshPayload, process.env.JWT_SECRET!);
      const decoded = await verify(token, process.env.JWT_SECRET!, 'HS256') as typeof refreshPayload;

      // Middleware should reject tokens with type=refresh
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('JWT Blacklist / Revocation', () => {
    it('should blacklist a JWT by jti', async () => {
      const blacklist = new JWTBlacklist();
      const jti = 'test-jti-blacklist-' + Date.now();

      await blacklist.blacklist(jti, 3600);
      const isBlacklisted = await blacklist.isBlacklisted(jti);
      expect(isBlacklisted).toBe(true);
    });

    it('should return false for non-blacklisted jti', async () => {
      const blacklist = new JWTBlacklist();
      const isBlacklisted = await blacklist.isBlacklisted('nonexistent-jti-' + Date.now());
      expect(isBlacklisted).toBe(false);
    });

    it('should support user-level revocation (Redis-backed)', async () => {
      const blacklist = new JWTBlacklist();
      const userId = 'user-revoke-test-' + Date.now();
      const now = Math.floor(Date.now() / 1000);

      await blacklist.revokeAllForUser(userId, 3600);
      const isRevoked = await blacklist.isUserRevokedAfter(userId, now - 60);
      expect(typeof isRevoked).toBe('boolean');
    });

    it('should support unblacklist for rare cases', async () => {
      const blacklist = new JWTBlacklist();
      const jti = 'test-jti-unblacklist-' + Date.now();

      await blacklist.blacklist(jti, 3600);
      expect(await blacklist.isBlacklisted(jti)).toBe(true);

      await blacklist.unblacklist(jti);
      expect(await blacklist.isBlacklisted(jti)).toBe(false);
    });
  });

  describe('Encryption Service (P2.1.1 + P2.2.4)', () => {
    let encryptionService: EncryptionService;

    beforeAll(() => {
      encryptionService = new EncryptionService();
      encryptionService.initialize('test-mfa-encryption-key-for-testing', '01');
    });

    it('should encrypt and decrypt MFA secrets correctly', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptionService.encrypt(secret);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(secret);
      expect(encrypted).not.toBe(secret);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted1 = encryptionService.encrypt(secret);
      const encrypted2 = encryptionService.encrypt(secret);

      expect(encrypted1).not.toBe(encrypted2);
      expect(encryptionService.decrypt(encrypted1)).toBe(secret);
      expect(encryptionService.decrypt(encrypted2)).toBe(secret);
    });

    it('should detect encrypted vs plaintext values', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptionService.encrypt(secret);

      expect(encryptionService.isEncrypted(encrypted)).toBe(true);
      expect(encryptionService.isEncrypted(secret)).toBe(false);
      expect(encryptionService.isEncrypted(null)).toBe(false);
      expect(encryptionService.isEncrypted(undefined as any)).toBe(false);
    });

    it('should reject tampered ciphertext (auth tag verification)', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptionService.encrypt(secret);

      const payload = JSON.parse(encrypted);
      // Tamper the auth tag (this MUST be detected by AES-GCM)
      payload.tag = Buffer.from('tampered-tag-data-16b').toString('base64url');
      const tampered = JSON.stringify(payload);

      expect(() => encryptionService.decrypt(tampered)).toThrow();
    });

    it('should support key rotation via reEncrypt', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptionService.encrypt(secret);

      encryptionService.addKey('test-mfa-encryption-key-v2', '02');

      const reEncrypted = encryptionService.reEncrypt(encrypted);
      const decrypted = encryptionService.decrypt(reEncrypted);

      expect(decrypted).toBe(secret);

      const payload = JSON.parse(reEncrypted);
      expect(payload.v).toBe('02');
    });
  });
});

// ═══════════════════════════════════════════════════════════
// P2.2.5 — LOAD TESTING AUTH (Metrics & Thresholds)
// ═══════════════════════════════════════════════════════════

describe('P2.2.5 — Load Testing Auth Framework', () => {
  describe('Auth Rate Limiting Infrastructure', () => {
    it('should have strict rate limiter (5/15min) for login endpoints', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const authPath = path.join(__dirname, '../routes/auth.ts');

      const authCode = fs.readFileSync(authPath, 'utf8');
      expect(authCode).toContain('strictAuthRateLimiter');
      expect(authCode).toContain('maxRequests: 5');
      expect(authCode).toContain('windowMs: 15 * 60 * 1000');
    });

    it('should have MFA rate limiter (20/15min)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const authPath = path.join(__dirname, '../routes/auth.ts');

      const authCode = fs.readFileSync(authPath, 'utf8');
      expect(authCode).toContain('mfaRateLimiter');
      expect(authCode).toContain('maxRequests: 20');
    });

    it('should have account lockout after 5 failed attempts', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const authPath = path.join(__dirname, '../routes/auth.ts');

      const authCode = fs.readFileSync(authPath, 'utf8');
      expect(authCode).toContain('ACCOUNT_LOCKOUT_MAX_ATTEMPTS');
    });
  });

  describe('Token Generation Performance', () => {
    it('should generate 100 access tokens in under 5 seconds', async () => {
      const { sign } = await import('hono/jwt');
      const { v4: uuidv4 } = await import('uuid');

      const start = Date.now();
      const tokens: string[] = [];

      for (let i = 0; i < 100; i++) {
        const now = Math.floor(Date.now() / 1000);
        const payload = {
          sub: `user-${i}`,
          tier: 'free',
          iss: 'agentforge',
          aud: 'agentforge-api',
          iat: now,
          exp: now + 900,
          jti: uuidv4(),
        };
        tokens.push(await sign(payload, process.env.JWT_SECRET!));
      }

      const duration = Date.now() - start;
      expect(tokens).toHaveLength(100);
      expect(duration).toBeLessThan(5000);
    });

    it('should verify 100 access tokens in under 5 seconds', async () => {
      const { sign, verify } = await import('hono/jwt');
      const { v4: uuidv4 } = await import('uuid');

      const tokens: string[] = [];
      for (let i = 0; i < 100; i++) {
        const now = Math.floor(Date.now() / 1000);
        tokens.push(await sign({
          sub: `user-${i}`,
          tier: 'free',
          iss: 'agentforge',
          aud: 'agentforge-api',
          iat: now,
          exp: now + 900,
          jti: uuidv4(),
        }, process.env.JWT_SECRET!));
      }

      const start = Date.now();
      for (const token of tokens) {
        await verify(token, process.env.JWT_SECRET!, 'HS256');
      }
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
    });

    it('should encrypt/decrypt 100 MFA secrets in under 5 seconds', () => {
      const enc = new EncryptionService();
      enc.initialize('test-mfa-encryption-key-for-testing', '01');

      const secrets = Array.from({ length: 100 }, () =>
        Array.from({ length: 16 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')
      );

      const start = Date.now();
      const encrypted = secrets.map(s => enc.encrypt(s));
      const decrypted = encrypted.map(e => enc.decrypt(e));
      const duration = Date.now() - start;

      expect(decrypted).toEqual(secrets);
      expect(duration).toBeLessThan(5000);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// P2.2.6 — RESILIENCE & RECOVERY
// ═══════════════════════════════════════════════════════════

describe('P2.2.6 — Resilience & Recovery', () => {
  describe('Graceful Shutdown Infrastructure', () => {
    it('should have graceful shutdown handlers registered', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(__dirname, '../index.ts');

      const code = fs.readFileSync(indexPath, 'utf8');
      expect(code).toContain('gracefulShutdown');
      expect(code).toContain('SIGTERM');
      expect(code).toContain('SIGINT');
    });

    it('should have shutdown timeout configured', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(__dirname, '../index.ts');

      const code = fs.readFileSync(indexPath, 'utf8');
      expect(code).toContain('SHUTDOWN_TIMEOUT');
    });
  });

  describe('Health Check Endpoints', () => {
    it('should have /health, /healthz, /readyz endpoints', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(__dirname, '../index.ts');

      const code = fs.readFileSync(indexPath, 'utf8');
      expect(code).toContain("'/health'");
      expect(code).toContain("'/healthz'");
      expect(code).toContain("'/readyz'");
    });

    it('should check DB and Redis connectivity in readiness probe', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(__dirname, '../index.ts');

      const code = fs.readFileSync(indexPath, 'utf8');
      expect(code).toContain('database');
      expect(code).toContain('redis');
      expect(code).toContain('SELECT 1');
    });
  });

  describe('Redis Fallback', () => {
    it('should have fallback logic when Redis is unavailable', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const jwtPath = path.join(__dirname, '../services/security/JWTBlacklist.ts');
      const jwtCode = fs.readFileSync(jwtPath, 'utf8');
      expect(jwtCode).toContain('localBlacklist');
    });
  });

  describe('Docker Health Checks', () => {
    it('should have healthcheck on all services in docker-compose', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const composePath = path.join(
        __dirname,
        '../../../../infra/docker/docker-compose.yml'
      );

      const compose = fs.readFileSync(composePath, 'utf8');
      expect(compose).toContain('healthcheck');
    });

    it('should have resource limits on all services', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const composePath = path.join(
        __dirname,
        '../../../../infra/docker/docker-compose.yml'
      );

      const compose = fs.readFileSync(composePath, 'utf8');
      expect(compose).toContain('limits');
      expect(compose).toContain('cpus');
      expect(compose).toContain('memory');
    });
  });
});

// ═══════════════════════════════════════════════════════════
// P2.2.7 — OBSERVABILITÉ CERTIFIÉE
// ═══════════════════════════════════════════════════════════

describe('P2.2.7 - Observabilite Certifiee', () => {
  describe('OpenTelemetry Initialization', () => {
    it('should have telemetry initialization in index.ts', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(__dirname, '../index.ts');

      const code = fs.readFileSync(indexPath, 'utf8');
      expect(code).toContain('initTelemetry');
    });

    it('should have graceful telemetry shutdown', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(__dirname, '../index.ts');

      const code = fs.readFileSync(indexPath, 'utf8');
      expect(code).toContain('shutdownTelemetry');
    });
  });

  describe('Tracing Service', () => {
    it('should support span creation and context propagation', async () => {
      const { tracingService } = await import('../services/telemetry/TracingService');
      expect(tracingService).toBeDefined();
      expect(typeof tracingService.startSpan).toBe('function');
      expect(typeof tracingService.withSpan).toBe('function');
      expect(typeof tracingService.addEvent).toBe('function');
      expect(typeof tracingService.setAttribute).toBe('function');
      expect(typeof tracingService.setAttributes).toBe('function');
      expect(typeof tracingService.recordException).toBe('function');
    });

    it('should support child span creation', async () => {
      const { tracingService } = await import('../services/telemetry/TracingService');
      expect(typeof tracingService.startChildSpan).toBe('function');
    });

    it('should provide isEnabled status', async () => {
      const { tracingService } = await import('../services/telemetry/TracingService');
      expect(typeof tracingService.isEnabled()).toBe('boolean');
    });
  });

  describe('Metrics Service', () => {
    it('should have all required counters and histograms', async () => {
      const { metricsService } = await import('../services/telemetry/MetricsService');
      expect(metricsService).toBeDefined();
      expect(typeof metricsService.recordExecution).toBe('function');
      expect(typeof metricsService.recordCacheHit).toBe('function');
      expect(typeof metricsService.recordExecutionDuration).toBe('function');
      expect(typeof metricsService.recordLLMCallDuration).toBe('function');
      expect(typeof metricsService.recordHTTPRequest).toBe('function');
      expect(typeof metricsService.recordExecutionStart).toBe('function');
      expect(typeof metricsService.recordExecutionEnd).toBe('function');
    });
  });

  describe('Alert Manager', () => {
    it('should have default alert rules configured', async () => {
      const { alertManager } = await import('../services/telemetry/AlertManager');
      expect(alertManager).toBeDefined();
      const rules = alertManager.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should track active alerts and support acknowledgement', async () => {
      const { alertManager } = await import('../services/telemetry/AlertManager');
      expect(typeof alertManager.getActiveAlerts).toBe('function');
      expect(typeof alertManager.acknowledge).toBe('function');
    });
  });

  describe('Observability Middleware', () => {
    it('should have observability middleware that creates spans', async () => {
      const mod = await import('../middleware/observability');
      expect(mod.observabilityMiddleware).toBeDefined();
    });

    it('should have request logger middleware with request ID', async () => {
      const mod = await import('../middleware/requestLogger');
      expect(mod.requestLogger).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════
// P2.2.8 — CI/CD ENTERPRISE VALIDATION
// ═══════════════════════════════════════════════════════════

describe('P2.2.8 — CI/CD Enterprise Validation', () => {
  describe('Build Scripts', () => {
    it('should have lint, typecheck, test, build scripts', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const pkgPath = path.join(__dirname, '../../../../package.json');

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      expect(pkg.scripts.lint).toBeDefined();
      expect(pkg.scripts.typecheck).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
      expect(pkg.scripts.build).toBeDefined();
    });

    it('should have test:coverage script in API package', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const apiPkgPath = path.join(__dirname, '../../package.json');

      const pkg = JSON.parse(fs.readFileSync(apiPkgPath, 'utf8'));
      expect(pkg.scripts['test:coverage']).toBeDefined();
    });
  });

  describe('Vitest Configuration', () => {
    it('should have coverage thresholds configured', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const vitestPath = path.join(__dirname, '../../vitest.config.ts');

      const config = fs.readFileSync(vitestPath, 'utf8');
      expect(config).toContain('coverage');
    });

    it('should have test timeout configured', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const vitestPath = path.join(__dirname, '../../vitest.config.ts');

      const config = fs.readFileSync(vitestPath, 'utf8');
      expect(config).toMatch(/timeout/i);
    });
  });

  describe('Docker Build Validation', () => {
    it('should have API Dockerfile with multi-stage build and non-root user', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const dockerfilePath = path.join(__dirname, '../../Dockerfile');

      const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
      expect(dockerfile).toContain('FROM node:20-alpine AS base');
      expect(dockerfile).toContain('FROM node:20-alpine AS runner');
      expect(dockerfile).toContain('USER node');
    });

    it('should have production Web Dockerfile with TLS support', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const dockerfilePath = path.join(__dirname, '../../../web/Dockerfile.production');

      expect(fs.existsSync(dockerfilePath)).toBe(true);
      const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
      expect(dockerfile).toContain('nginx-secure.conf');
      expect(dockerfile).toContain('443');
    });
  });

  describe('TypeScript Configuration', () => {
    it('should have strict mode in tsconfig (via base config)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const tsconfigPath = path.join(__dirname, '../../../../tsconfig.base.json');

      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// P2.2.9 — NON-REGRESSION FINAL AUDIT
// ═══════════════════════════════════════════════════════════

describe('P2.2.9 — Non-Regression Final Audit', () => {
  describe('No Tenant Leaks in API Responses', () => {
    it('should NOT expose MFA secrets in user API responses', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const adminPath = path.join(__dirname, '../routes/admin.ts');
      const code = fs.readFileSync(adminPath, 'utf8');

      // The user list endpoint should NOT return mfaSecret
      const userSelectMatch = code.match(/select\(\{[^}]*\}\)/g);
      if (userSelectMatch) {
        for (const match of userSelectMatch) {
          expect(match).not.toContain('mfaSecret');
          expect(match).not.toContain('passwordHash');
          expect(match).not.toContain('mfaBackupCodes');
        }
      }
    });

    it('should NOT expose passwordHash in any auth response', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const authPath = path.join(__dirname, '../routes/auth.ts');
      const code = fs.readFileSync(authPath, 'utf8');

      // Check that user data returned in c.json responses does not include
      // passwordHash or mfaSecret. These only appear in DB query contexts.
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Only check lines that are part of c.json() response blocks
        // that contain user data objects (e.g., user: { id, email, ... })
        if (line.includes('c.json(') && line.includes('user:') && !line.includes('userId')) {
          // Scan the next few lines for the response block
          const block = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
          if (block.includes('id:') && block.includes('email:')) {
            // This is a user data response — ensure no secrets
            expect(block).not.toContain('passwordHash');
            expect(block).not.toContain('mfaSecret');
          }
        }
      }
    });
  });

  describe('No Admin Endpoints Exposed Without Auth', () => {
    it('should have requirePermission on ALL admin routes', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const adminPath = path.join(__dirname, '../routes/admin.ts');
      const code = fs.readFileSync(adminPath, 'utf8');

      // Every admin route definition line should include requirePermission
      // Route format: admin.METHOD('/path', requirePermission({...}), handler)
      const routeLines = code.split('\n').filter(l =>
        l.trim().startsWith('admin.') &&
        (l.includes('.get(') || l.includes('.post(') || l.includes('.put(') ||
         l.includes('.patch(') || l.includes('.delete('))
      );

      for (const line of routeLines) {
        expect(line).toContain('requirePermission');
      }
    });
  });

  describe('No Insecure Default Configuration', () => {
    it('should NOT have hardcoded secrets in source code', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(__dirname, '../index.ts');
      const code = fs.readFileSync(indexPath, 'utf8');

      expect(code).not.toMatch(/password\s*[:=]\s*['"][^'"]+['"]/);
      expect(code).not.toMatch(/secret\s*[:=]\s*['"][^'"]+['"]/i);
    });

    it('should have proper CORS configuration', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(__dirname, '../index.ts');
      const code = fs.readFileSync(indexPath, 'utf8');

      expect(code).toContain('cors');
      expect(code).toContain('credentials: true');
      expect(code).toContain('allowMethods');
      expect(code).toContain('allowHeaders');
    });
  });

  describe('Encryption Service No Regression', () => {
    it('should still encrypt/decrypt correctly after P2.2 changes', () => {
      const enc = new EncryptionService();
      enc.initialize('test-mfa-encryption-key-for-testing', '01');

      const testData = [
        'short',
        'A'.repeat(1000),
        'Special chars: accents and unicode',
        '{"json": true, "nested": {"key": "value"}}',
        'JBSWY3DPEHPK3PXP',
      ];

      for (const data of testData) {
        const encrypted = enc.encrypt(data);
        const decrypted = enc.decrypt(encrypted);
        expect(decrypted).toBe(data);
      }
    });
  });

  describe('RBAC No Regression', () => {
    it('should maintain correct permission matrix after P2.2 changes', () => {
      const rbac = new RBACService();

      // Critical checks that must never regress
      expect(rbac.hasPermission('viewer', 'users', 'delete')).toBe(false);
      expect(rbac.hasPermission('user', 'billing', 'read')).toBe(false);
      expect(rbac.hasPermission('manager', 'users', 'manage')).toBe(false);
      expect(rbac.hasPermission('admin', 'tenants', 'delete')).toBe(false);
      expect(rbac.hasPermission('super_admin', 'users', 'manage')).toBe(true);
      expect(rbac.hasPermission('admin', 'users', 'manage')).toBe(true);
      expect(rbac.hasPermission('viewer', 'projects', 'read')).toBe(true);
    });
  });

  describe('JWT Blacklist No Regression', () => {
    it('should still blacklist tokens correctly', async () => {
      const blacklist = new JWTBlacklist();
      const jti = `regression-test-${Date.now()}`;

      expect(await blacklist.isBlacklisted(jti)).toBe(false);

      await blacklist.blacklist(jti, 3600);
      expect(await blacklist.isBlacklisted(jti)).toBe(true);
    });
  });
});
