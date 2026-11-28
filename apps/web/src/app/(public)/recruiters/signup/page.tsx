import type { Metadata } from "next"
import Link from "next/link"

import { Notice } from "@lynx/ui/components/notice"

import { AuthLayout } from "@/components/auth-layout"
import { loginNotice } from "@/components/auth/messages"
import { SignupForm } from "@/components/auth/signup-form"

export const metadata: Metadata = { title: "Create a recruiter account" }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function RecruiterSignupPage({ searchParams }: Props) {
  const params = await searchParams
  const error = typeof params.error === "string" ? params.error : undefined
  const notice = loginNotice(error, undefined)

  return (
    <AuthLayout
      eyebrow="Recruiters"
      title="Create a recruiter account"
      lede="Use your work email. Our team reviews every recruiter account before it can search candidates."
      points={[
        "Sign up with your company email or Google Workspace account.",
        "We check that your email matches your company, then approve your account.",
        "Approved recruiters are marked as affiliated with Hyperlynx.",
      ]}
    >
      <div className="flex flex-col gap-gap-md">
        <h2 className="text-label text-text-primary">Sign up as a recruiter</h2>
        {notice ? <Notice tone="error">{notice}</Notice> : null}
        <SignupForm role="recruiter" loginHref="/recruiters/login" />
        <p className="border-t border-border pt-gap-md text-body text-text-secondary">
          Looking for work?{" "}
          <Link href="/signup" className="text-text-primary hover:text-text-secondary">
            Create a candidate account
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
