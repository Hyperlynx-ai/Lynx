import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { CvData } from "./cv"
import { FACT_CATEGORIES, FACT_SOURCES, factsFromCv } from "./facts"

const root = join(import.meta.dirname, "..", "..", "..")
const sample = CvData.parse(
  JSON.parse(readFileSync(join(root, "packages", "shared", "fixtures", "cv-sample.json"), "utf8"))
)
const migration = readdirSync(join(root, "supabase", "migrations"))
  .filter((f) => f.endsWith("_lynx_facts.sql"))
  .map((f) => readFileSync(join(root, "supabase", "migrations", f), "utf8"))
  .join("\n")

describe("facts", () => {
  it("reads one fact per CV item, in order", () => {
    const facts = factsFromCv(sample)
    expect(facts).toContainEqual({ category: "summary", text: "Backend Software Engineer" })
    expect(facts).toContainEqual({ category: "personal", text: "Lives in Bengaluru, India" })
    expect(facts).toContainEqual({
      category: "experience",
      text: "Software Engineer II at Northwind Payments (Jul 2023 – Present)",
    })
    expect(facts).toContainEqual({
      category: "education",
      text: "B.Tech, Computer Science and Engineering, Example Institute of Technology (2021)",
    })
    expect(facts).toContainEqual({ category: "skill", text: "Languages: Go, Python, SQL" })
    expect(facts).toContainEqual({ category: "language", text: "Hindi (Native)" })
    expect(facts.filter((f) => f.category === "experience")).toHaveLength(2)
  })

  it("uses the same categories and sources as the database", () => {
    const listed = (column: string) => {
      const block = migration.slice(migration.indexOf(`${column} in (`))
      return [...block.slice(0, block.indexOf(")")).matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    }
    expect(listed("category").sort()).toEqual(Object.keys(FACT_CATEGORIES).sort())
    expect(listed("source").sort()).toEqual(Object.keys(FACT_SOURCES).sort())
  })
})
