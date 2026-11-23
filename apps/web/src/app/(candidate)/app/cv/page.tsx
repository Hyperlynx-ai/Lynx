import type { Metadata } from "next"

import { AI_TEST_DATA_ONLY } from "@lynx/shared/policy"
import { Eyebrow } from "@lynx/ui/components/eyebrow"
import { Headline } from "@lynx/ui/components/headline"
import { Notice } from "@lynx/ui/components/notice"

import { CvFileActions } from "@/components/cv/cv-file-actions"
import { CvUpload } from "@/components/cv/cv-upload"
import { CvView } from "@/components/cv/cv-view"
import { DemoNotice } from "@/components/cv/demo-notice"
import { cvErrorMessage } from "@/components/cv/messages"
import { requireRole } from "@/lib/auth/require-role"
import { getCv, listCvs, type CvFile } from "@/lib/cv/api"

export const metadata: Metadata = { title: "Your CV" }

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

/** What happened to a CV that isn't readable yet, and what to do. */
const STATUS_NOTE: Record<string, string> = {
  uploaded:
    "Lynx hasn't read this file yet. If you reached today's CV-reading limit, try again tomorrow.",
  parsing: "Lynx is reading this file. Refresh in a moment.",
  failed: cvErrorMessage("parse_failed"),
  not_a_cv: cvErrorMessage("not_a_cv"),
}

export default async function CvPage() {
  const user = await requireRole("candidate", "/app/cv")
  const cvs = await listCvs()
  const latest = cvs?.[0]
  const detail = latest?.status === "parsed" ? await getCv(latest.id) : null
  const current = detail?.current ?? null
  const name = current?.data.basics.name

  return (
    <div className="flex flex-col gap-gap-lg">
      <div className="flex flex-col gap-gap-md">
        <Eyebrow>Your CV</Eyebrow>
        <Headline
          as="h1"
          size="headline"
          lead={current && name ? `${name}.` : "Your CV."}
          muted={
            current
              ? "This is what Lynx read from your CV. Check it; editing arrives soon."
              : "Upload it once: Lynx reads it in about 20 seconds and builds your profile from it."
          }
        />
      </div>

      {AI_TEST_DATA_ONLY ? <DemoNotice /> : null}

      {cvs === null ? (
        <Notice tone="error" title="Couldn't load your CV">
          The server didn&apos;t answer. Refresh the page in a moment.
        </Notice>
      ) : null}

      {latest && current && detail ? (
        <section aria-label="Your CV, as Lynx read it" className="flex flex-col gap-gap-md">
          <SourceLine file={latest} version={current.version} label={current.label} />
          <CvView cv={current.data} />
          <CvFileActions cvId={latest.id} fileName={latest.fileName} />
        </section>
      ) : latest ? (
        <section aria-label="Your latest upload" className="flex flex-col gap-gap-md">
          <Notice tone={latest.status === "parsing" ? "info" : "error"} title={latest.fileName}>
            {STATUS_NOTE[latest.status] ?? STATUS_NOTE.failed}
          </Notice>
          <CvFileActions
            cvId={latest.id}
            fileName={latest.fileName}
            canRetry={latest.status === "uploaded" || latest.status === "failed"}
          />
        </section>
      ) : null}

      {cvs !== null ? <CvUpload userId={user.id} compact={Boolean(latest)} /> : null}

      {cvs && cvs.length > 1 ? <EarlierUploads files={cvs.slice(1)} /> : null}
    </div>
  )
}

function SourceLine(props: { file: CvFile; version: number; label: string | null }) {
  return (
    <p className="font-mono text-mono text-text-secondary">
      {props.file.fileName} · uploaded {dateFormat.format(new Date(props.file.createdAt))} · version{" "}
      {props.version}
      {props.label ? ` (${props.label})` : ""}
    </p>
  )
}

function EarlierUploads({ files }: { files: CvFile[] }) {
  return (
    <section aria-labelledby="earlier-uploads" className="flex flex-col gap-gap-sm">
      <h2 id="earlier-uploads" className="text-label text-text-secondary">
        Earlier uploads
      </h2>
      <ul className="border-t border-border">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex flex-col gap-gap-sm border-b border-border py-4 md:flex-row md:items-center md:justify-between"
          >
            <p className="font-mono text-mono text-text-primary">
              {file.fileName}
              <span className="text-text-secondary">
                {" "}
                · {dateFormat.format(new Date(file.createdAt))}
              </span>
            </p>
            <CvFileActions cvId={file.id} fileName={file.fileName} />
          </li>
        ))}
      </ul>
    </section>
  )
}
