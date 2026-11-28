import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthLayout } from "@/components/auth-layout"
import { NewPasswordForm } from "@/components/auth/password-forms"
import { getSessionUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Choose a new password" }

/** Reached from the reset link (via /auth/callback, which signs the user in). */
export default async function ResetPasswordPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login?error=expired")

  return (
    <AuthLayout eyebrow="Account" title="Choose a new password" lede={`For ${user.email}.`}>
      <NewPasswordForm mode="reset" />
    </AuthLayout>
  )
}
