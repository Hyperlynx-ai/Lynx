import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { CandidateProfileInput, COUNTRIES, educationLevelFromDegrees, PATHWAYS } from "./candidate"

const migrations = join(import.meta.dirname, "..", "..", "..", "supabase", "migrations")
const sql = readdirSync(migrations)
  .filter((f) => f.endsWith("_candidates.sql"))
  .map((f) => readFileSync(join(migrations, f), "utf8"))
  .join("\n")

describe("candidate profile", () => {
  it("lists the same countries and pathways as the database", () => {
    const listed = (column: string) => {
      const block = sql.slice(sql.indexOf(`${column} <@ array[`))
      return [...block.slice(0, block.indexOf("]")).matchAll(/'([a-z_A-Z]+)'/g)].map((m) => m[1])
    }
    expect(listed("countries").sort()).toEqual(Object.keys(COUNTRIES).sort())
    expect(listed("pathways").sort()).toEqual(Object.keys(PATHWAYS).sort())
  })

  it("validates the onboarding answers", () => {
    const ok = {
      targetRoles: ["ICU Nurse"],
      countries: ["AE"],
      experienceLevel: "mid",
      educationLevel: "bachelors",
      pathways: ["job_switch"],
      visaStatus: "needs_sponsorship",
      currentLocation: "Kochi, India",
      phone: "+91 90000 00002",
      phoneIsWhatsapp: true,
    }
    expect(CandidateProfileInput.safeParse(ok).success).toBe(true)
    expect(CandidateProfileInput.safeParse({ ...ok, countries: ["XX"] }).success).toBe(false)
    expect(CandidateProfileInput.safeParse({ ...ok, targetRoles: [] }).success).toBe(false)
    expect(CandidateProfileInput.safeParse({ ...ok, phone: "call me" }).success).toBe(false)
  })

  it("guesses the education level from degrees on a CV", () => {
    expect(educationLevelFromDegrees(["B.Tech"])).toBe("bachelors")
    expect(educationLevelFromDegrees(["B.E.", "HSC (Class XII)"])).toBe("bachelors")
    expect(educationLevelFromDegrees(["B.Sc. Nursing"])).toBe("bachelors")
    expect(educationLevelFromDegrees(["MBA", "B.Com"])).toBe("masters")
    expect(educationLevelFromDegrees(["M.Sc. Physics"])).toBe("masters")
    expect(educationLevelFromDegrees(["PhD in Chemistry"])).toBe("doctorate")
    expect(educationLevelFromDegrees(["Diploma in Mechanical Engineering"])).toBe("diploma")
    expect(educationLevelFromDegrees(["Mechanical Engineering"])).toBe(null)
    expect(educationLevelFromDegrees([null])).toBe(null)
  })
})
