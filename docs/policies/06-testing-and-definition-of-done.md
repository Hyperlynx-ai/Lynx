# Testing and definition of done

> Status: ACTIVE. What must be true before a change is finished.

## Definition of done (every PR)

- Lint, type check, tests and build pass locally and in CI.
- New logic has tests; AI changes have eval results.
- The Vercel preview deployment works for the changed pages.
- UI changes pass the `void-terminal-glass` checklist.
- `AGENTS.md` files are updated if commands or conventions changed.
- `docs/third-party.md` is updated if code was reused.
- The chunk's status in `docs/roadmap.md` is updated.

## Rules

**TEST-01: MUST NOT disable, skip or delete tests, skip hooks (`--no-verify`), or weaken lint, type or CI rules to get a green result.**
*Why:* a green check that lies is worse than a red one.
*Enforced by:* code review

**TEST-02: MUST add tests for new logic.** No coverage percentage is required.
TypeScript: Vitest. Python: pytest. User journeys: Playwright for the key flows (sign up, onboarding, apply, interview, search, payment).
*Why:* agents change code fast; tests catch what they break.
*Enforced by:* code review

**TEST-03: Tests MUST NOT call paid external services** (AI providers, Resend, Razorpay, LiveKit). Mock them. Integration tests that use a provider's test mode are clearly marked and do not run on every PR.
*Why:* cost, flakiness, and test data leaking into real systems.
*Enforced by:* code review

**TEST-04: MUST use strict typing:** TypeScript `strict`; Python type hints checked by Pyright.
*Why:* types catch many agent mistakes before runtime.
*Enforced by:* automated (CI)

**TEST-05: MUST format and lint with the shared tools:** ESLint + Prettier for TypeScript, Ruff for Python.
*Why:* consistent code is easier for agents and humans to read.
*Enforced by:* automated (pre-commit hook and CI)
