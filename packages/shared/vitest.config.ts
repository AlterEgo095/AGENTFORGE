import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@agentforge/shared': path.resolve(__dirname, './src/index.ts'),
    },
  },
});
