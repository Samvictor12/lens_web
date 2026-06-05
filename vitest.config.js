import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/backend/__tests__/**/*.test.js'],
    reporters: ['verbose'],
  },
});
