import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Coverage is scoped to the pure calculation engine on purpose.
      // App.tsx / ResultsTable.tsx are presentation — the owner eyeballs
      // those — and are excluded rather than driven to an artificial number.
      include: ['src/lib/calculator/**/*.ts'],
      exclude: ['src/lib/calculator/index.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
})
