# 0009: Public GitHub repository

- Status: accepted
- Date: 2026-11-22
- Decided by: owner (Sujaan)

## Context

Vercel's free Hobby plan cannot connect a private repository owned by a
GitHub organization, so pull-request previews and production deployments
from `main` did not work. Vercel Pro would fix it, but there is no budget
for paid plans yet, and for now the owner is the only contributor.

## Decision

Make `Hyperlynx-ai/Lynx` public. Before the switch, the full history of every
branch was checked for secret values, credential files and key patterns:
none were found.

## Consequences

- Vercel Hobby deploys from GitHub: previews for every PR, production from
  `main`, and automatic web → api → ai linking.
- Anyone can read the code, prompts, policies, roadmap, issues and pull
  requests, and the commit history including commit author emails.
- Secret hygiene matters even more (policy SEC-10): nothing confidential in
  commits, PRs or issues.
- GitHub branch protection becomes available on the free plan.
- GitHub Actions minutes are free for public repositories.
- Revisit before teammates join or before anything confidential (customer
  data, contracts, partner names) needs to live next to the code: Vercel Pro
  plus a private repository is the expected end state.
