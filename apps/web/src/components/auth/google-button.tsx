"use client"

import { useState } from "react"

import { Button } from "@lynx/ui/components/button"

import { createClient } from "@/lib/supabase/client"

type GoogleButtonProps = {
  /** Which area the person is signing in to (checked after sign-in). */
  expect: "candidate" | "recruiter"
  next?: string
  label?: string
  onError?: (message: string) => void
}

/** "Continue with Google" (Supabase OAuth). Returns through /auth/callback. */
export function GoogleButton({
  expect,
  next,
  label = "Continue with Google",
  onError,
}: GoogleButtonProps) {
  const [pending, setPending] = useState(false)

  async function signIn() {
    setPending(true)
    const callback = new URL("/auth/callback", window.location.origin)
    callback.searchParams.set("expect", expect)
    if (next) callback.searchParams.set("next", next)
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    })
    if (error) {
      setPending(false)
      onError?.("Google sign-in isn't available right now. Use your email instead.")
    }
  }

  return (
    <Button
      type="button"
      variant="heroSecondary"
      className="w-full"
      disabled={pending}
      onClick={signIn}
    >
      <GoogleMark />
      {pending ? "Opening Google…" : label}
    </Button>
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <path d="M21.35 11.1H12v2.98h5.35c-.23 1.44-1.66 4.22-5.35 4.22-3.22 0-5.85-2.67-5.85-5.96S8.78 6.38 12 6.38c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 3.82 14.55 2.9 12 2.9 6.98 2.9 2.9 6.98 2.9 12s4.08 9.1 9.1 9.1c5.25 0 8.73-3.69 8.73-8.89 0-.6-.07-1.06-.15-1.51z" />
    </svg>
  )
}

/** A thin "or" divider between Google and the email form. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-gap-sm" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-mono text-text-secondary">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
