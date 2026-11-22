"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

import { Button } from "@lynx/ui/components/button"
import { Field } from "@lynx/ui/components/field"
import { Input } from "@lynx/ui/components/input"
import { Notice } from "@lynx/ui/components/notice"

import { createClient } from "@/lib/supabase/client"

const CONFIRM_WORD = "DELETE"

/** Deletes the account through the API (DELETE /api/me) after typing DELETE. */
export function DeleteAccount() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const typed = String(new FormData(event.currentTarget).get("deleteConfirm") ?? "").trim()
    if (typed !== CONFIRM_WORD) return setError(`Type ${CONFIRM_WORD} to confirm.`)

    setPending(true)
    setError(null)
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const res = token
      ? await fetch("/api/me", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      : null
    if (!res?.ok) {
      setPending(false)
      return setError("We couldn't delete your account. Try again, or contact the Hyperlynx team.")
    }
    await supabase.auth.signOut()
    router.replace("/")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-gap-md">
      <Field htmlFor="delete-confirm" label={`Type ${CONFIRM_WORD} to confirm`}>
        <Input id="delete-confirm" name="deleteConfirm" autoComplete="off" className="max-w-xs" />
      </Field>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button
        type="submit"
        variant="outlineSquare"
        className="w-full sm:w-auto sm:self-start"
        disabled={pending}
      >
        {pending ? "Deleting…" : "Delete my account"}
      </Button>
    </form>
  )
}
