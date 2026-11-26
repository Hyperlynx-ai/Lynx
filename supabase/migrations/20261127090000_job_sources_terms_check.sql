-- Job sources after the terms check (chunk 3.4, ADR 0007 and 0011).
-- Removes sources we won't use and records each kept source's terms in its
-- notes (shown in Admin -> Job sources).
--
-- Dropped: Adzuna and Jooble (no keys, owner 2026-11-26); Remotive (its terms
-- forbid showing its jobs to collect sign-ups); The Muse (terms page could
-- not be read); Careerjet (needs each visitor's IP address and forbids
-- building an independent job database). None of them was ever switched on.

delete from public.job_sources
where id in ('adzuna', 'jooble', 'remotive', 'themuse', 'careerjet');

update public.job_sources set notes = v.notes
from (values
  ('curated_sheet', 'The team''s Google Sheet (Jobs and Opportunities tabs), synced daily. Needs CURATED_SHEET_ID.'),
  ('arbeitnow', 'Free public API, Europe-focused. Commercial use: agree a monthly fee with Arbeitnow before launch (KL-26).'),
  ('remoteok', 'Free public API for remote jobs. Credit Remote OK and link back to its job page (no logo).'),
  ('himalayas', 'Free public API for remote jobs. Credit Himalayas; Apply must use its application link; no resale to aggregators.'),
  ('jobicy', 'Free public API for remote jobs (last 7 days). Credit Jobicy as the source.'),
  ('reed', 'UK jobs. Needs REED_API_KEY. No published API terms: get Reed''s written permission before commercial launch (KL-26).')
) as v (id, notes)
where public.job_sources.id = v.id;
