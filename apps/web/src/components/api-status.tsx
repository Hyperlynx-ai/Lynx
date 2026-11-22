"use client"

import { useEffect, useState } from "react"

import { StatusDot } from "@lynx/ui/components/status-dot"

type Health = { status: string; ai?: string }
type State = { kind: "checking" } | { kind: "ok"; health: Health } | { kind: "down" }

/**
 * Footer status: calls /api/health (web -> api -> ai) so a glance shows the
 * whole chain is wired up in each environment.
 */
export function ApiStatus() {
  const [state, setState] = useState<State>({ kind: "checking" })

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/health", { signal: controller.signal, cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Health>) : Promise.reject(res.status)))
      .then((health) => setState({ kind: "ok", health }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: "down" })
      })
    return () => controller.abort()
  }, [])

  const allOk = state.kind === "ok" && state.health.ai === "ok"
  const text =
    state.kind === "checking"
      ? "checking systems"
      : state.kind === "down"
        ? "api: unreachable"
        : allOk
          ? "all systems operational"
          : `api: ok · ai: ${state.health.ai ?? "unknown"}`

  return (
    <p className="flex items-center gap-2 font-mono text-mono text-text-secondary" role="status">
      <StatusDot state={state.kind === "checking" ? "unknown" : allOk ? "ok" : "down"} />
      {text}
    </p>
  )
}
