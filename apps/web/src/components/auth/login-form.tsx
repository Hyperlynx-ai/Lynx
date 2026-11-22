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
import { authErrorMessage } from "./messages"

type LoginFormProps = {
  expect: "candidate" | "recruiter"
  next?: string
  signupHref: string
}

/** Email + password login, plus Google. */
export function LoginForm({ expect, next, signupHref }: LoginFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    const { error: signInError } = await createClient().auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    })
    if (signInError) {
      setPending(false)
      setError(authErrorMessage(signInError))
      return
    }
    const target = new URLSearchParams({ expect })
    if (next) target.set("next", next)
    router.replace(`/auth/continue?${target.toString()}`)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-gap-md">
      <GoogleButton expect={expect} next={next} onError={setError} />
      <OrDivider />
      <form onSubmit={onSubmit} className="flex flex-col gap-gap-md" noValidate={false}>
        <Field htmlFor="email" label="Email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field htmlFor="password" label="Password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" variant="heroPrimary" className="w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <div className="flex flex-wrap justify-between gap-gap-sm text-body">
        <Link href="/forgot-password" className="text-text-secondary hover:text-text-primary">
          Forgot your password?
        </Link>
        <Link href={signupHref} className="text-text-primary hover:text-text-secondary">
          Create an account
        </Link>
      </div>
    </div>
  )
}
