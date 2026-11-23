/**
 * Per-user daily limits for each AI task (policy AI-07, SEC-07). Keeps the
 * AI bill predictable and stops one account from draining it. Calls that hit
 * the cap are refused before reaching the AI service.
 */
export const DAILY_CAPS: Record<string, number> = {
  ping: 20,
  cv_parse: 10,
  cv_edit: 60,
  facts_extract: 30,
}

/** Tasks not listed get this cap. */
export const DEFAULT_DAILY_CAP = 20

export function dailyCapFor(task: string): number {
  return DAILY_CAPS[task] ?? DEFAULT_DAILY_CAP
}
