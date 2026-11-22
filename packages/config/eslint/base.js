import { createRequire } from "node:module"
import babelParser from "@babel/eslint-parser"
import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import turboPlugin from "eslint-plugin-turbo"

const require = createRequire(import.meta.url)

/**
 * Shared ESLint rules for every TypeScript package in the repo.
 * Adapted from the shadcn/ui monorepo template (MIT). Type errors are caught by
 * `tsc`, so this config parses TypeScript with Babel and stays fast.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: [require.resolve("@babel/preset-typescript")],
        },
      },
    },
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "off",
      // TypeScript already reports unused and undefined names more accurately.
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },
  {
    ignores: ["dist/**", "coverage/**"],
  },
]
