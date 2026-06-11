import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@alterego/event-bus': path.resolve(__dirname, '../event-bus/dist/index.js'),
      '@alterego/kernel': path.resolve(__dirname, '../kernel/dist/index.js'),
      '@alterego/workflow': path.resolve(__dirname, '../workflow/dist/index.js'),
      '@alterego/memory': path.resolve(__dirname, '../memory/dist/index.js'),
      '@alterego/knowledge': path.resolve(__dirname, '../knowledge/dist/index.js'),
      '@alterego/reflection': path.resolve(__dirname, '../reflection/dist/index.js'),
      '@alterego/learning': path.resolve(__dirname, '../learning/dist/index.js'),
      '@alterego/cost-optimizer': path.resolve(__dirname, '../cost-optimizer/dist/index.js'),
    },
  },
});
