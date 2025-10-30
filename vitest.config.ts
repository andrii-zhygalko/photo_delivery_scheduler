import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['__tests__/setup.ts'],
    // Set NODE_ENV for test environment
    env: {
      NODE_ENV: 'test',
    },
    // Disable file parallelism to prevent race conditions during global cleanup
    fileParallelism: false,
    // Increase hook timeout for global cleanup (deletes all test users, can take 30-60s with multiple files)
    hookTimeout: 60000,
    server: {
      deps: {
        inline: ['next'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
