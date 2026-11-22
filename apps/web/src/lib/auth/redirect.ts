/**
 * Returns `next` only if it is a path on this site; otherwise `fallback`.
 * Prevents open redirects through ?next=https://evil.example.
 */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback
  try {
    const url = new URL(next, "http://placeholder.local")
    if (url.origin !== "http://placeholder.local") return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
