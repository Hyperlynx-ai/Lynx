import { readFileSync } from "node:fs"
import { join } from "node:path"

import { renderToBuffer } from "@react-pdf/renderer"
import { Packer } from "docx"
import { describe, expect, it } from "vitest"

import { CvData } from "@lynx/shared/cv"

import { buildCvDocx } from "./docx"
import { buildLayout, CV_TEMPLATES, exportFileName, type CvTemplate } from "./layout"
import { CvPdf } from "./pdf"

const sample = CvData.parse(
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, "../../../../../packages/shared/fixtures/cv-sample.json"),
      "utf8"
    )
  )
)
const templates = Object.keys(CV_TEMPLATES) as CvTemplate[]

describe("CV export", () => {
  it("lays out every section of the CV in order", () => {
    const layout = buildLayout(sample)
    expect(layout.name).toBe("Aarav Sharma")
    expect(layout.contact).toContain("aarav.sharma@example.com")
    expect(layout.sections.map((s) => s.title)).toEqual([
      "Summary",
      "Experience",
      "Education",
      "Projects",
      "Skills",
      "Certifications",
      "Languages",
      "Achievements",
    ])
  })

  it.each(templates)("renders a PDF with the %s template", async (template) => {
    const buffer = await renderToBuffer(<CvPdf layout={buildLayout(sample)} template={template} />)
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-")
    expect(buffer.length).toBeGreaterThan(3000)
  })

  it.each(templates)("renders a Word file with the %s template", async (template) => {
    const buffer = await Packer.toBuffer(buildCvDocx(sample, template))
    // A .docx is a zip whose document contains the CV's text.
    expect(buffer.subarray(0, 2).toString()).toBe("PK")
    expect(buffer.length).toBeGreaterThan(5000)
  })

  it("names the files after the candidate", () => {
    expect(exportFileName(sample, "pdf")).toBe("Aarav Sharma CV.pdf")
    expect(exportFileName({ ...sample, basics: { ...sample.basics, name: "A/B<>" } }, "docx")).toBe(
      "AB CV.docx"
    )
  })

  it("copes with an almost empty CV", async () => {
    const empty = CvData.parse({
      basics: {
        name: null,
        headline: null,
        email: null,
        phone: null,
        location: null,
        links: [],
        summary: null,
      },
      experience: [],
      education: [],
      projects: [],
      skills: [],
      certifications: [],
      languages: [],
      achievements: [],
    })
    const buffer = await renderToBuffer(<CvPdf layout={buildLayout(empty)} template="classic" />)
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-")
    await expect(Packer.toBuffer(buildCvDocx(empty, "modern"))).resolves.toBeTruthy()
  })
})
