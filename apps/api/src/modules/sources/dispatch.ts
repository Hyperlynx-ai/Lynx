/**
 * Starts the "Jobs ingestion" GitHub Actions workflow right away when an admin
 * presses "Run now" (ADR 0011), so they don't wait for the hourly pickup.
 *
 * The run processes every source with a pending request, so two quick clicks
 * are both covered. Without a token the hourly scheduled run still picks the
 * request up.
 */
export type DispatchRun = () => Promise<boolean>

export type DispatchConfig = {
  /** Fine-grained token for this repository only, with "Actions: read and write". */
  token: string
  /** "owner/name". */
  repository: string
  /** Which database the workflow writes to (the one this API reads). */
  target: "production" | "staging"
  fetchImpl?: typeof fetch
}

const WORKFLOW = "jobs-ingest.yml"

export function createWorkflowDispatcher(config: DispatchConfig): DispatchRun {
  const fetchImpl = config.fetchImpl ?? fetch
  return async () => {
    const res = await fetchImpl(
      `https://api.github.com/repos/${config.repository}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${config.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: { target: config.target, sources: "requested" },
        }),
        signal: AbortSignal.timeout(10_000),
      }
    )
    return res.status === 204
  }
}
