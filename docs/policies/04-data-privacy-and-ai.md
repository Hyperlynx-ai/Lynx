# Data privacy and AI

> Status: ACTIVE. Personal data handling, AI providers, prompts and evals.

We handle CVs, contact details, interview video and proctoring data of real
people. We design to a GDPR-level baseline and to India's DPDP Act.

## Privacy rules

**PRIV-01: MUST NOT put real personal data in code, tests, fixtures, eval sets, screenshots or docs.** Use synthetic people.
*Why:* repos are copied everywhere; personal data must not be.
*Enforced by:* code review

**PRIV-02: MUST NOT log personal data** (names, emails, phone numbers, CV text, transcripts). Log IDs instead.
*Why:* logs are widely accessible and kept a long time.
*Enforced by:* code review

**PRIV-03: MUST record consent** before: showing a profile and contact details to recruiters, recording an interview, sharing interview results, running proctoring, and sending emails. Consent is stored in `consents` with a timestamp and can be withdrawn.
*Why:* required by DPDP and GDPR, and the right thing to do.
*Enforced by:* code review

**PRIV-04: MUST NOT collect sensitive fields** (gender, age or date of birth, ethnicity, religion, disability, profile photos). Interview video is collected only with consent, for the interview.
*Why:* not needed for matching, and risky to hold.
*Enforced by:* code review

**PRIV-05: Candidates MUST be able to see, export and delete their data**, including everything Lynx has learned ("What Lynx knows about you").
*Why:* legal requirement and a product promise.
*Enforced by:* code review

**PRIV-06: Data MUST have retention periods.** Defaults: interview recordings and proctoring snapshots 180 days; deleted accounts removed within 30 days.
*Why:* data we no longer hold cannot leak.
*Enforced by:* scheduled jobs (Phase 10)

## AI rules

**AI-01: MUST choose models only in `services/ai/config/models.yaml`** (or its documented environment overrides). Never hard-code a model name or provider in feature code.
*Why:* lets us switch to any model, including Chinese and niche providers, in one place.
*Enforced by:* code review; the file is a protected area

**AI-02: Candidate data MUST only go to providers approved for it.** Until a paid AI key is in place, use only synthetic or test data. Before real users, every provider that receives candidate data must be on a paid tier that does not train on our data.
*Why:* some free tiers allow the provider to use what we send.
*Enforced by:* owner approval of `models.yaml` changes

**AI-03: Prompts MUST be versioned files** (in `services/ai/prompts/` or the interview agent's prompts folder), not strings scattered in code.
*Why:* prompts are product logic; they need history and review.
*Enforced by:* code review

**AI-04: Every change to a prompt, model or ranking logic MUST include an eval result** (before and after) in the PR. Evals live in `evals/`.
*Why:* AI changes can quietly make things worse.
*Enforced by:* code review

**AI-05: AI MUST NOT make final decisions about people.** It ranks, scores and recommends; a human recruiter decides. No automatic rejection of candidates.
*Why:* fairness, and several jurisdictions regulate automated hiring decisions.
*Enforced by:* code review

**AI-06: MUST NOT send protected attributes to a model,** and ranking must be checked for bias before launch.
*Why:* prevents discriminatory matching.
*Enforced by:* code review; evals

**AI-07: Every AI call MUST be logged in `ai_calls`** (task, model, tokens, latency, cost estimate, error) without personal data, and MUST respect per-user daily caps.
*Why:* cost control and debugging.
*Enforced by:* the shared AI client in `services/ai`

**AI-08: Lynx MUST NOT invent jobs, companies, salaries, visa rules or outcomes.** It answers from data we hold and says when it does not know.
*Why:* trust is the product.
*Enforced by:* prompts and evals
