import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Eyebrow } from "@lynx/ui/components/eyebrow"
import { Headline } from "@lynx/ui/components/headline"

import { CvEditor } from "@/components/cv/editor/cv-editor"
import { getCandidate } from "@/lib/candidate/api"
import { getCv } from "@/lib/cv/api"

export const metadata: Metadata = { title: "Edit your CV" }

export default async function EditCvPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ version?: string }>
}) {
  const { id } = await params
  const requested = Number((await searchParams).version) || undefined
  const [detail, candidate] = await Promise.all([getCv(id, requested), getCandidate()])
  if (!detail?.current) notFound()

  return (
    <div className="flex flex-col gap-gap-lg">
      <div className="flex flex-col gap-gap-md">
        <Eyebrow>
          <Link
            href="/app/cv"
            className="transition-colors duration-200 ease-standard hover:text-text-primary"
          >
            Your CV
          </Link>{" "}
          / Edit
        </Eyebrow>
        <Headline
          as="h1"
          size="headline"
          lead="Edit your CV."
          muted="Change anything yourself, or ask Lynx. Lynx only rewrites what's already there; you accept or reject every change."
        />
      </div>
      <CvEditor
        // Remount when another version is opened.
        key={detail.current.id}
        cvId={detail.cv.id}
        version={detail.current.version}
        initial={detail.current.data}
        versions={detail.versions}
        matchingVersionId={candidate?.candidate?.matchingCvVersionId ?? null}
        targetRoles={candidate?.candidate?.targetRoles ?? []}
      />
    </div>
  )
}
