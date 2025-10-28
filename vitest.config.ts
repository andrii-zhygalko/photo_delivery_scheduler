import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnvConfig } from '@next/env';
import { VitestReporter } from 'tdd-guard-vitest';

loadEnvConfig(process.cwd());

export default defineConfig({
  test: {
    reporters: ['default', new VitestReporter()],
    globals: true,
    environment: 'node',
    setupFiles: ['__tests__/setup.ts'],
    // Set NODE_ENV for test environment
    env: {
      NODE_ENV: 'test',
    },
    // Disable file parallelism to prevent race conditions during global cleanup
    fileParallelism: false,
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
