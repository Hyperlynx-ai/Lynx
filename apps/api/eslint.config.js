import { config } from "@lynx/config/eslint/node"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    rules: {
      // The deployed API can't load workspace TypeScript packages (KL-19).
      // Use the copies in src/shared/ (scripts/shared-sync.mjs) instead.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@lynx/shared", "@lynx/shared/*", "@lynx/ui", "@lynx/ui/*"],
              message: "Import from src/shared/ (pnpm shared:sync) instead (KL-19).",
            },
          ],
        },
      ],
    },
  },
]
