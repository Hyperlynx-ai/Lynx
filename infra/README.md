# infra/: deployment

How Hyperlynx is deployed. **Protected area**: the owner approves changes.
Decisions: `docs/decisions/0005-hosting.md`.

## Vercel (team "Lynx", scope `lynx-8004`)

| Project | ID | Root directory | Framework | Region |
|---|---|---|---|---|
| `lynx-web` | `prj_qrfsRZ0bwhoPHbDl9NCQK9e7lhYi` | `apps/web` | Next.js | `bom1` (Mumbai) |
| `lynx-api` | `prj_XKFdHTNvs4iR4B49PvcUCY4xSbv6` | `apps/api` | Fastify | `bom1` |
| `lynx-ai` | `prj_nMmk55RLmN46x71NPrS4xdgnpyiz` | `services/ai` | FastAPI | `bom1` |

- Each app has a `vercel.json` (region, and `relatedProjects` so `lynx-web`
  finds the matching `lynx-api` deployment, and `lynx-api` finds `lynx-ai`:
  production → production, PR preview → same-branch preview).
- `main` deploys to production; every PR gets preview deployments (once the
  GitHub repository is connected, see below).
- Node.js 22 for `lynx-web` and `lynx-api`; Python 3.12 (`.python-version`) for
  `lynx-ai`.

### Environment variables

| Project | Variable | Environments | Notes |
|---|---|---|---|
| `lynx-web`, `lynx-api` | `ENABLE_EXPERIMENTAL_COREPACK=1` | all | lets Vercel use pnpm 12 from `packageManager` |
| `lynx-api`, `lynx-ai` | `AI_SERVICE_TOKEN` | production, preview (different values) | shared secret for API → AI calls |
| `lynx-ai` | `GOOGLE_API_KEY` | production, preview | Gemini (policy AI-02: test data only for now) |

List them with `vercel env ls --scope lynx-8004 --project <project>`.
Add one with `vercel env add <NAME> --environment <env> --scope lynx-8004 --project <project> --sensitive`
(the value is read from the terminal; never put it in a file in the repo).

### Owner setup still needed (one time)

1. **Connect GitHub to Vercel:** vercel.com → Account Settings →
   Authentication → connect GitHub. Then install the Vercel GitHub app on the
   `Hyperlynx-ai` organization with access to `Lynx`. Then, from the repo
   root:
   ```
   vercel git connect https://github.com/Hyperlynx-ai/Lynx.git --scope lynx-8004 --project lynx-web --yes
   ```
   (repeat for `lynx-api` and `lynx-ai`; or connect in each project's
   Settings → Git).
2. **Commit authors:** add the email you commit with to your Vercel account
   (Account Settings → Emails). On the Hobby plan only the owner's commits can
   deploy; teammates need the team on Pro.
3. **Deployment Protection:** Vercel now protects every `*.vercel.app` URL,
   production included, with a Vercel login by default. In each project's
   Settings → Deployment Protection:
   - `lynx-web`: Vercel Authentication → "Only Preview Deployments" (the
     public site must be reachable).
   - `lynx-api`, `lynx-ai`: Vercel Authentication → disabled. They are called
     server-to-server (web → api → ai) and protect themselves (login tokens,
     service token).

### Verify a deployment

```
vercel curl https://<deployment-url>/health --scope lynx-8004
vercel logs <deployment-url> --scope lynx-8004
```

## Supabase

See `supabase/AGENTS.md`. Projects: `lynx-staging` (`ilwyezmqbnwwujeeonsv`)
and `lynx-prod` (`sgpcgcetujzvtlcolfyw`), both in Mumbai. Migrations reach
them only through `.github/workflows/db-migrate.yml`.

## Coming later

- LiveKit Cloud (interviews), Phase 5: `services/interview-agent`.
- Inngest (background jobs), Phase 3.
- Resend (email), Phases 1 and 8.
