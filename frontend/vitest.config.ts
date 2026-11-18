import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { preserveSymlinks: true },
  // App tests drive the composer from the first frame; the launch splash has its own tests.
  test: { include: ['src/**/__tests__/**/*.test.ts'], maxWorkers: 2, env: { GLIDE_SPLASH: '0' } }
})
