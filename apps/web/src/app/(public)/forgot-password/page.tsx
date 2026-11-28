import type { Metadata } from "next"

import { AuthLayout } from "@/components/auth-layout"
import { ForgotPasswordForm } from "@/components/auth/password-forms"

export const metadata: Metadata = { title: "Reset your password" }

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      eyebrow="Account"
      title="Forgot your password?"
      lede="Enter your email and we'll send you a link to choose a new one."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
