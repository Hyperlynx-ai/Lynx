import type { Metadata } from "next"

import { Notice } from "@lynx/ui/components/notice"

import { AuthLayout } from "@/components/auth-layout"
import { LoginForm } from "@/components/auth/login-form"
import { loginNotice } from "@/components/auth/messages"

export const metadata: Metadata = { title: "Recruiter login" }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function RecruiterLoginPage({ searchParams }: Props) {
  const params = await searchParams
  const one = (key: string) => (typeof params[key] === "string" ? params[key] : undefined)
  const notice = loginNotice(one("error"), one("account"))

  return (
    <AuthLayout
      eyebrow="Recruiters"
      title="Recruiter login"
      lede="Find verified candidates and manage your roles."
    >
      <div className="flex flex-col gap-gap-md">
        <h2 className="text-label text-text-primary">Log in as a recruiter</h2>
        {notice ? <Notice tone="info">{notice}</Notice> : null}
        <LoginForm expect="recruiter" next={one("next")} signupHref="/recruiters/signup" />
      </div>
    </AuthLayout>
  )
}
