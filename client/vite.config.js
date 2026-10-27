import { defineConfig } from 'vitest/config';
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: { proxy: { '/api': 'http://127.0.0.1:3001' } },
  test: { environment: 'jsdom', clearMocks: true },
});
