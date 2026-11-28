import type { Metadata } from "next"
import Link from "next/link"

import { AuthLayout } from "@/components/auth-layout"
import { SignupForm } from "@/components/auth/signup-form"

export const metadata: Metadata = { title: "Create your account" }

export default function SignupPage() {
  return (
    <AuthLayout
      eyebrow="Candidates · free"
      title="Create your account"
      lede="Jobs, internships and scholarships in the UAE, Europe and 25+ countries, ranked for you by Lynx."
      points={[
        "Upload your CV once; Lynx builds your profile from it.",
        "Get opportunities ranked by how well they fit you.",
        "Practise and verify your skills with Lynx's video interviews.",
      ]}
    >
      <div className="flex flex-col gap-gap-md">
        <h2 className="text-label text-text-primary">Sign up as a candidate</h2>
        <SignupForm role="candidate" loginHref="/login" />
        <p className="border-t border-border pt-gap-md text-body text-text-secondary">
          Hiring?{" "}
          <Link href="/recruiters/signup" className="text-text-primary hover:text-text-secondary">
            Create a recruiter account
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
