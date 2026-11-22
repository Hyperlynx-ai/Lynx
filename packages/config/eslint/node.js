import globals from "globals"

import { config as baseConfig } from "./base.js"

/**
 * ESLint config for Node services (apps/api) and scripts.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]
