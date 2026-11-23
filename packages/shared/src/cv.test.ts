import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { CvData, isCvMediaType, isEmptyCv } from "./cv"

const sample: unknown = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "fixtures", "cv-sample.json"), "utf8")
)

describe("CvData", () => {
  it("matches the shared sample exactly (same check as services/ai)", () => {
    // Parsing strips unknown keys and fails on missing ones, so a round trip
    // catches drift between this schema and the Python one.
    expect(CvData.parse(sample)).toEqual(sample)
  })

  it("rejects a CV missing a section", () => {
    const { skills: _skills, ...rest } = CvData.parse(sample)
    expect(CvData.safeParse(rest).success).toBe(false)
  })

  it("knows an empty CV", () => {
    const cv = CvData.parse(sample)
    expect(isEmptyCv(cv)).toBe(false)
    expect(
      isEmptyCv({
        ...cv,
        basics: { ...cv.basics, name: null, email: null, summary: null },
        experience: [],
        education: [],
        projects: [],
        skills: [],
      })
    ).toBe(true)
  })

  it("accepts only PDF and DOCX", () => {
    expect(isCvMediaType("application/pdf")).toBe(true)
    expect(isCvMediaType("image/png")).toBe(false)
    expect(isCvMediaType("toString")).toBe(false)
  })
})
