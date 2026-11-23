# 0010: Candidate data model and the AI pipeline (Phase 2)

- Status: accepted
- Date: 2026-11-23
- Decided by: owner approved the roadmap; details by the building agent

## Context

Phase 2 adds candidate onboarding, CV upload and parsing, an AI CV editor,
exports, and "What Lynx knows about you". It is the first phase that sends
personal data to an AI model and the first that writes candidate data.

## Decision

**Data** (`supabase/migrations`, row-level security on every table):

| Table | Holds |
|---|---|
| `candidates` | one row per candidate: preferences from onboarding (target roles, countries, level, pathway, work authorization, phone), visibility to recruiters, the CV version used for matching, `onboarded_at` |
| `cvs` | an uploaded CV file (path in the private `cvs` bucket, name, type) |
| `cv_versions` | structured CV content (`data` JSON, schema below) per version: the parsed original, AI edits, the candidate's own edits |
| `lynx_facts` | what Lynx knows: category, text, source (`cv`, `interview`, `chat`, `candidate`), editable and deletable by the candidate |
| `consents` | append-only record of what a user agreed to and when (policy PRIV-03) |
| `ai_calls` | every AI call: task, model, tokens, latency, estimated cost, status; no personal data (AI-07); server-only |

**Who talks to whom**

- The browser uploads CV files straight to Supabase Storage
  (`cvs/<user id>/...`, existing policies) and calls `apps/api` for
  everything else.
- `apps/api` acts **as the user** (Supabase client with the user's token, so
  row-level security applies too) for candidate data. It uses the secret key
  only for things the user may not do themselves (writing `ai_calls`,
  creating signed URLs for the AI service).
- `services/ai` is stateless: it receives what it needs (a signed URL to the
  CV file, or JSON), runs the model, and returns the result plus usage
  (model, tokens, latency). `apps/api` logs the call and enforces per-user
  daily caps before calling.

**Structured CV** (`CvData`, defined in Python in `services/ai` and mirrored
as zod in `apps/api`): `basics` (name, headline, contact, location, links,
summary), `experience[]`, `education[]`, `projects[]`, `skills[]` (grouped),
`certifications[]`, `languages[]`, `achievements[]`. Dates are free-text
strings as written in the CV. Every piece of text keeps the candidate's own
facts; the AI never invents experience (AI-08).

**AI tasks** (`services/ai/config/models.yaml`): `cv_parse` (file → `CvData`;
PDFs go to the model natively, DOCX as extracted text), `cv_edit` (one section +
instruction → revised section + one-line explanation), `facts_extract`
(free text → facts). Facts from a CV are derived from `CvData` in code, not by
another AI call.

**Providers**: Pydantic AI's built-in providers, plus any OpenAI-compatible
endpoint declared under `providers:` in `models.yaml` (base URL + the name of
the environment variable holding the key), which covers DeepSeek, Qwen, Kimi,
GLM, OpenRouter and self-hosted models.

**Exports**: PDF (`@react-pdf/renderer`) and DOCX (`docx`) are generated in the
browser from `CvData` with three templates, so no server work is needed.

**Demo-data guard** (KL-05): until a paid AI key is in place, the upload step
tells people to use the sample CV we provide, not their real one.

## Consequences

- Ownership is enforced twice (API checks + row-level security).
- The AI service can be scaled or moved without touching the database.
- Changing the CV schema means changing the Python model, the zod mirror and
  the export templates together; tests compare a sample in both languages.
