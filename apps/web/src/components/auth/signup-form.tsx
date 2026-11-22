"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

import { Button } from "@lynx/ui/components/button"
import { Field } from "@lynx/ui/components/field"
import { Input } from "@lynx/ui/components/input"
import { Notice } from "@lynx/ui/components/notice"

import { createClient } from "@/lib/supabase/client"

import { GoogleButton, OrDivider } from "./google-button"
import { authErrorMessage, PASSWORD_HINT } from "./messages"

type SignupFormProps = {
  role: "candidate" | "recruiter"
  loginHref: string
}

/** Sign-up with name, email and password, plus Google. */
export function SignupForm({ role, loginHref }: SignupFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fullName = String(form.get("fullName") ?? "").trim()
    const email = String(form.get("email") ?? "").trim()
    const password = String(form.get("password") ?? "")
    setError(null)

    if (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
      setError(`Choose a stronger password. ${PASSWORD_HINT}`)
      return
    }

    setPending(true)
    const callback = new URL("/auth/callback", window.location.origin)
    callback.searchParams.set("expect", role)
    const { data, error: signUpError } = await createClient().auth.signUp({
      email,
      password,
      options: {
        // The database trigger reads `role` and `full_name` (see supabase/migrations).
        data: { full_name: fullName, role },
        emailRedirectTo: callback.toString(),
      },
    })
    if (signUpError) {
      setPending(false)
      setError(authErrorMessage(signUpError))
      return
    }
    if (!data.session) {
      // Email confirmation is on: the user must click the link first.
      setPending(false)
      setCheckEmail(true)
      return
    }
    router.replace(`/auth/continue?expect=${role}`)
    router.refresh()
  }

  if (checkEmail) {
    return (
      <Notice tone="success" title="Check your email">
        We sent you a link to confirm your address. Open it to finish creating your account.
      </Notice>
    )
  }

  return (
    <div className="flex flex-col gap-gap-md">
      <GoogleButton expect={role} label="Sign up with Google" onError={setError} />
      <OrDivider />
      <form onSubmit={onSubmit} className="flex flex-col gap-gap-md">
        <Field htmlFor="fullName" label="Full name">
          <Input id="fullName" name="fullName" autoComplete="name" required maxLength={200} />
        </Field>
        <Field htmlFor="email" label={role === "recruiter" ? "Work email" : "Email"}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field htmlFor="password" label="Password" hint={PASSWORD_HINT}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            aria-describedby="password-hint"
          />
        </Field>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" variant="heroPrimary" className="w-full" disabled={pending}>
          {pending ? "Creating your account…" : "Create account"}
        </Button>
      </form>
      <p className="text-body text-text-secondary">
        Already have an account?{" "}
        <Link href={loginHref} className="text-text-primary hover:text-text-secondary">
          Log in
        </Link>
      </p>
    </div>
  )
}
