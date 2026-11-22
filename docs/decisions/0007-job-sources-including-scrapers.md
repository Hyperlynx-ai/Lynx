# 0007: Job sources, including scrapers

- Status: accepted
- Date: 2026-11-22
- Decided by: owner (Sujaan)

## Context

Candidates should see as many opportunities as possible. Free sources include
the team's curated Google Sheet, public job APIs and feeds, and public
company job boards on applicant tracking systems. The owner also chose to
scrape sites such as LinkedIn, Indeed, Bayt and Naukri, which breaks those
sites' terms of service.

## Decision

- Every source is an adapter in `services/ai` with its own on/off switch in
  the admin console, run logs and health status.
- Order of work: curated sheet, free APIs and feeds, public ATS boards, then
  scrapers (JobSpy, MIT).
- Scrapers: conservative rate limits, no logged-in scraping, link back to the
  original posting, honor takedown requests, and a legal review before public
  launch.
- External jobs link out ("Apply on source"); only affiliated jobs support
  in-platform applications.

## Consequences

- Broad coverage quickly, especially for the Gulf and India.
- Scrapers can break or be blocked at any time and carry legal risk; the
  switches let us turn any source off instantly.
