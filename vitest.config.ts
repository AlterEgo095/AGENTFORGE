// ============================================================
// AgentForge - Root Vitest Configuration
// Excludes benchmark, chaos, SLA, and multinode test suites
// which have their own dedicated vitest configs and timeouts.
// Run those with: npx vitest run --config tests/benchmarks/vitest.config.ts
// ============================================================

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup}.config.*',
      // These test suites have their own vitest configs with custom timeouts
      'tests/benchmarks/**',
      'tests/chaos/**',
      'tests/sla/**',
      'tests/multinode/**',
      'tests/certification/**',
      'tests/voe-report/**',
    ],
  },
});
