#!/usr/bin/env node
/**
 * Design lint (void-terminal-glass skill v2: "a check beats a sentence").
 * Fails on styles that bypass the design tokens in packages/ui/src/styles/theme.css:
 *
 *   hex          a raw colour (#34d59a) instead of a token class
 *   palette      Tailwind's default colour scales (text-gray-500, bg-blue-600)
 *   radius       any radius except rounded-none, rounded-pill, rounded-control
 *   shadow       any shadow except shadow-ring, shadow-popover, shadow-none
 *   gradient     gradient backgrounds and gradient text
 *   font-size    arbitrary font sizes (text-[15px]) instead of the type scale
 *   weight       semibold / bold / extrabold / black (Inter 400 and 500 only)
 *   uppercase    all-caps labels
 *
 *   node scripts/design-lint.mjs        lint apps/web/src and packages/ui/src
 *
 * A line that really needs an exception ends with `// design-lint-ignore` and
 * says why in a comment above it. Files that render documents, not the website
 * (the CV PDF and DOCX export), are skipped.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = join(import.meta.dirname, "..")
const DIRS = ["apps/web/src", "packages/ui/src"]
const SKIP = [/[\\/]lib[\\/]cv-export[\\/]/, /[\\/]generated[\\/]/]

const RADIUS_OK = /^rounded(-(t|r|b|l|s|e|tl|tr|bl|br|ss|se|es|ee))?-(none|pill|control)$/
const SHADOW_OK = /^shadow-(ring|popover|none)$/
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose"

const RULES = [
  { id: "hex", re: /(?<=["'`\s(:[,])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g },
  {
    id: "palette",
    re: new RegExp(
      `(?<![\\w-])(?:[a-z-]+:)*(?:text|bg|border|ring|fill|stroke|outline|decoration|divide|from|to|via|accent|caret)-(?:${PALETTE})-\\d{2,3}\\b`,
      "g"
    ),
  },
  { id: "radius", re: /(?<![\w-])(?:[a-z-]+:)*rounded(?:-[\w[\].%]+)*/g, ok: RADIUS_OK },
  { id: "shadow", re: /(?<![\w-])(?:[a-z-]+:)*shadow(?:-[\w[\].%,()/]+)*/g, ok: SHADOW_OK },
  { id: "gradient", re: /(?<![\w-])(?:bg-(?:gradient|linear|radial|conic)-[\w-]+|bg-clip-text)/g },
  { id: "font-size", re: /(?<![\w-])text-\[\d[\w.]*\]/g },
  { id: "weight", re: /(?<![\w-])font-(?:semibold|bold|extrabold|black)\b/g },
  { id: "uppercase", re: /(?<![\w-])uppercase\b/g },
]

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* files(path)
    else if (/\.(tsx?|css)$/.test(name) && !SKIP.some((re) => re.test(path))) yield path
  }
}

const findings = []
for (const dir of DIRS) {
  for (const path of files(join(ROOT, dir))) {
    // The theme defines the tokens: it is the one place raw values belong.
    if (path.endsWith(join("styles", "theme.css"))) continue
    const lines = readFileSync(path, "utf8").split(/\r?\n/)
    lines.forEach((line, i) => {
      if (line.includes("design-lint-ignore")) return
      // CSS files: only raw colours matter (utilities are checked in markup).
      const rules = path.endsWith(".css") ? RULES.filter((r) => r.id === "hex") : RULES
      for (const rule of rules) {
        for (const match of line.matchAll(rule.re)) {
          const token = match[0].replace(/^(?:[a-z-]+:)+/, "")
          if (rule.ok && rule.ok.test(token)) continue
          findings.push(`${relative(ROOT, path)}:${i + 1}  ${rule.id}  ${match[0]}`)
        }
      }
    })
  }
}

if (findings.length) {
  console.error(findings.join("\n"))
  console.error(
    `\n${findings.length} design-lint finding(s). Use the tokens in packages/ui/src/styles/theme.css (skill: void-terminal-glass).`
  )
  process.exit(1)
}
console.log("Design lint: no findings.")
