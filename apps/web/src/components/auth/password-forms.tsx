"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

import { Button } from "@lynx/ui/components/button"
import { Field } from "@lynx/ui/components/field"
import { Input } from "@lynx/ui/components/input"
import { Notice } from "@lynx/ui/components/notice"

import { createClient } from "@/lib/supabase/client"

import { authErrorMessage, PASSWORD_HINT } from "./messages"

function strongEnough(password: string) {
  return password.length >= 8 && /[a-z]/i.test(password) && /\d/.test(password)
}

/** Sends a password-reset link. Always shows the same message (no account probing). */
export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim()
    setPending(true)
    setError(null)
    const callback = new URL("/auth/callback", window.location.origin)
    callback.searchParams.set("next", "/reset-password")
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: callback.toString(),
    })
    setPending(false)
    if (resetError && resetError.code?.startsWith("over_")) {
      setError(authErrorMessage(resetError))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <Notice tone="success" title="Check your email">
        If an account exists for that address, we&apos;ve sent a link to choose a new password.
      </Notice>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-gap-md">
      <Field htmlFor="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" variant="heroPrimary" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <Link href="/login" className="text-body text-text-secondary hover:text-text-primary">
        Back to log in
      </Link>
    </form>
  )
}

type NewPasswordFormProps = {
  /** "reset" after a reset link; "change" in account settings. */
  mode: "reset" | "change"
}

/** Sets a new password for the signed-in user. */
export function NewPasswordForm({ mode }: NewPasswordFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const password = String(form.get("password") ?? "")
    const confirm = String(form.get("confirm") ?? "")
    setError(null)
    if (!strongEnough(password)) return setError(`Choose a stronger password. ${PASSWORD_HINT}`)
    if (password !== confirm) return setError("The two passwords don't match.")

    setPending(true)
    const { error: updateError } = await createClient().auth.updateUser({ password })
    setPending(false)
    if (updateError) return setError(authErrorMessage(updateError))

    if (mode === "reset") {
      router.replace("/auth/continue")
      router.refresh()
    } else {
      formElement.reset()
      setDone(true)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-gap-md">
      <Field htmlFor="password" label="New password" hint={PASSWORD_HINT}>
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
      <Field htmlFor="confirm" label="Repeat the new password">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {done ? <Notice tone="success">Your password has been changed.</Notice> : null}
      <Button
        type="submit"
        variant={mode === "reset" ? "heroPrimary" : "heroSecondary"}
        className="w-full sm:w-auto sm:self-start"
        disabled={pending}
      >
        {pending ? "Saving…" : mode === "reset" ? "Save and continue" : "Change password"}
      </Button>
    </form>
  )
}
