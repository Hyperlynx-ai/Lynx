"use client"

import { useState } from "react"

import type { CvData } from "@lynx/shared/cv"
import { Button } from "@lynx/ui/components/button"
import { Notice } from "@lynx/ui/components/notice"
import { cn } from "@lynx/ui/lib/utils"

import { CV_TEMPLATES, exportFileName, type CvTemplate } from "@/lib/cv-export/layout"

function save(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Download the CV as PDF or Word in one of three templates. Files are made
 * in the browser (the PDF and Word libraries load on the first click).
 */
export function ExportPanel({ cv, note }: { cv: CvData; note?: string }) {
  const [template, setTemplate] = useState<CvTemplate>("classic")
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download(format: "pdf" | "docx") {
    setBusy(format)
    setError(null)
    try {
      const blob =
        format === "pdf"
          ? await (await import("@/lib/cv-export/pdf")).renderCvPdf(cv, template)
          : await (await import("@/lib/cv-export/docx")).renderCvDocx(cv, template)
      save(blob, exportFileName(cv, format))
    } catch {
      setError("We couldn't create the file. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section
      aria-labelledby="export-heading"
      className="flex flex-col gap-gap-md border border-border p-6"
    >
      <div>
        <h2 id="export-heading" className="text-label text-text-primary">
          Download your CV
        </h2>
        <p className="mt-1 text-body text-text-secondary">
          {note ?? "Choose a template, then download a PDF to send or a Word file to edit."}
        </p>
      </div>
      <fieldset className="grid gap-gap-sm md:grid-cols-3">
        <legend className="sr-only">Template</legend>
        {(Object.keys(CV_TEMPLATES) as CvTemplate[]).map((key) => (
          <label
            key={key}
            className={cn(
              "flex cursor-pointer flex-col gap-1 border p-4 transition-colors duration-200 ease-standard has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
              template === key ? "border-accent" : "border-border hover:border-text-secondary"
            )}
          >
            <input
              type="radio"
              name="cv-template"
              value={key}
              checked={template === key}
              onChange={() => setTemplate(key)}
              className="sr-only"
            />
            <span className="flex items-center gap-2 text-label text-text-primary">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-pill",
                  template === key ? "bg-accent" : "border border-border"
                )}
              />
              {CV_TEMPLATES[key].label}
            </span>
            <span className="text-body text-text-secondary">{CV_TEMPLATES[key].description}</span>
          </label>
        ))}
      </fieldset>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-gap-md">
        <Button
          type="button"
          variant="heroPrimary"
          disabled={busy !== null}
          onClick={() => void download("pdf")}
        >
          {busy === "pdf" ? "Creating PDF…" : "Download PDF"}
        </Button>
        <Button
          type="button"
          variant="heroSecondary"
          disabled={busy !== null}
          onClick={() => void download("docx")}
        >
          {busy === "docx" ? "Creating Word file…" : "Download Word"}
        </Button>
      </div>
    </section>
  )
}
