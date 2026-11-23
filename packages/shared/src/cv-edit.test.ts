import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { CvData } from "./cv"
import { cleanCv, getSection, guardEdit, setSection } from "./cv-edit"

const cv = CvData.parse(
  JSON.parse(readFileSync(join(import.meta.dirname, "..", "fixtures", "cv-sample.json"), "utf8"))
)

describe("guardEdit (AI-08)", () => {
  it("keeps jobs, employers and dates; only bullet points change", () => {
    const after = [
      {
        ...cv.experience[0]!,
        company: "Google",
        start: "2015",
        highlights: ["Built a Go settlement service processing 2 million transactions a day"],
      },
      { ...cv.experience[1]!, highlights: ["Developed shipment-tracking APIs in FastAPI"] },
      { title: "CTO", company: "Invented Inc", highlights: ["Led everything"] },
    ]
    const { content, warnings } = guardEdit("experience", cv.experience, after, cv)
    const jobs = content as typeof cv.experience
    // "Google" didn't match an original job, so it was dropped like the invented one.
    expect(jobs.map((j) => j.company)).toEqual(["Contoso Logistics"])
    expect(jobs[0]!.start).toBe("Jun 2021")
    expect(jobs[0]!.highlights).toEqual(["Developed shipment-tracking APIs in FastAPI"])
    expect(warnings[0]).toBe("Lynx suggested 2 jobs that aren't in your CV; they were left out.")
  })

  it("leaves out skills that aren't anywhere in the CV", () => {
    const after = [{ name: "Languages", skills: ["Go", "Rust", "Python"] }]
    const { content, warnings } = guardEdit("skills", cv.skills, after, cv)
    expect(content).toEqual([{ name: "Languages", skills: ["Go", "Python"] }])
    expect(warnings).toEqual(["Left out skills that aren't in your CV: Rust."])
  })

  it("flags numbers that aren't in the CV but keeps the text", () => {
    const after = "Backend engineer who cut costs by 35% across 4 years of payments work."
    const { content, warnings } = guardEdit("summary", cv.basics.summary, after, cv)
    expect(content).toBe(after)
    expect(warnings).toEqual([
      "Check these numbers; they aren't in your CV: 35%. Keep them only if they're true.",
    ])
  })

  it("never changes contact details", () => {
    const after = { ...cv.basics, email: "x@evil.example", headline: "Senior Backend Engineer" }
    const { content } = guardEdit("basics", cv.basics, after, cv)
    expect(content).toMatchObject({ email: cv.basics.email, headline: "Senior Backend Engineer" })
  })

  it("reads and writes sections, including the summary", () => {
    expect(getSection(cv, "summary")).toBe(cv.basics.summary)
    const updated = setSection(cv, "summary", "Short.")
    expect(updated.basics.summary).toBe("Short.")
    expect(updated.basics.name).toBe(cv.basics.name)
    expect(setSection(cv, "achievements", ["A"]).achievements).toEqual(["A"])
  })
})

describe("cleanCv", () => {
  it("trims, nulls empty fields and drops blank entries", () => {
    const messy = {
      ...cv,
      basics: { ...cv.basics, headline: "  ", links: [{ label: "", url: "" }] },
      experience: [
        { ...cv.experience[0]!, highlights: ["  Built things ", "", " "] },
        { title: "", company: null, location: null, start: null, end: null, highlights: [""] },
      ],
      skills: [
        { name: "Tools", skills: ["Go", " ", "SQL "] },
        { name: "Empty", skills: [""] },
      ],
    }
    const clean = cleanCv(messy)
    expect(clean.basics.headline).toBeNull()
    expect(clean.basics.links).toEqual([])
    expect(clean.experience).toHaveLength(1)
    expect(clean.experience[0]!.highlights).toEqual(["Built things"])
    expect(clean.skills).toEqual([{ name: "Tools", skills: ["Go", "SQL"] }])
    expect(CvData.parse(clean)).toEqual(clean)
  })

  it("leaves a clean CV unchanged", () => {
    expect(cleanCv(cv)).toEqual(cv)
  })
})
