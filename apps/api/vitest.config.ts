import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Building the Fastify app can be slow on a busy machine (e.g. `pnpm check`
    // runs builds in parallel); keep tests from failing on timing alone.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
})
