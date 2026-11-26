import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

/** Unit tests for code that doesn't need a browser (e.g. CV export). */
export default defineConfig({
  // Next.js leaves JSX to its own compiler (tsconfig "jsx": "preserve"); tests compile it here.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.{ts,tsx}"] },
})
