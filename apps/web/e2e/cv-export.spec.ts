import { readFileSync } from "node:fs"

import { expect, test } from "@playwright/test"

import { onboardedCandidate, seedParsedCv } from "./helpers"

test("download the CV as PDF and Word in each template", async ({ page }) => {
  const email = await onboardedCandidate(page, "Dana Download", "export")
  await seedParsedCv(email)
  await page.goto("/app/cv")

  const panel = page.getByRole("region", { name: "Download your CV" })
  await expect(panel).toBeVisible()

  for (const template of ["Classic", "Modern", "Compact"]) {
    await panel.getByText(template, { exact: true }).click()

    const [pdf] = await Promise.all([
      page.waitForEvent("download"),
      panel.getByRole("button", { name: "Download PDF" }).click(),
    ])
    expect(pdf.suggestedFilename()).toBe("Aarav Sharma CV.pdf")
    const pdfBytes = readFileSync((await pdf.path())!)
    expect(pdfBytes.subarray(0, 5).toString()).toBe("%PDF-")

    const [word] = await Promise.all([
      page.waitForEvent("download"),
      panel.getByRole("button", { name: "Download Word" }).click(),
    ])
    expect(word.suggestedFilename()).toBe("Aarav Sharma CV.docx")
    const wordBytes = readFileSync((await word.path())!)
    expect(wordBytes.subarray(0, 2).toString()).toBe("PK")
  }
})
