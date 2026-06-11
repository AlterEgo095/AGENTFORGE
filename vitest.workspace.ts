// ============================================================
// AgentForge - Vitest Workspace Configuration
// Each package has its own vitest config with proper aliases.
// Specialized test suites (benchmarks, chaos, SLA, multinode)
// are excluded from the default workspace run.
// ============================================================

import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/api/vitest.config.ts',
  'packages/shared/vitest.config.ts',
]);
