import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['__tests__/setup.ts'],
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
