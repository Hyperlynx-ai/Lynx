-- Storage buckets. Files with personal data are private and reached only
-- through short-lived signed URLs (policy SEC-06). No profile photos (PRIV-04).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Candidate CVs: PDF or DOCX, up to 10 MB.
  ('cvs', 'cvs', false, 10485760, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  -- Interview recordings (written by LiveKit Egress through the server).
  ('interview-recordings', 'interview-recordings', false, null, array[
    'video/mp4', 'video/webm', 'audio/ogg', 'audio/mp4',
    'application/vnd.apple.mpegurl', 'video/mp2t'
  ]),
  -- Proctoring snapshots, up to 2 MB each.
  ('proctoring-snapshots', 'proctoring-snapshots', false, 2097152, array[
    'image/jpeg', 'image/png', 'image/webp'
  ]),
  -- Company logos: public, uploaded through the API.
  ('company-logos', 'company-logos', true, 2097152, array[
    'image/png', 'image/jpeg', 'image/webp'
  ])
on conflict (id) do nothing;

-- CVs: each candidate manages only the files in their own folder: cvs/<user id>/...
create policy "cvs: read own"
  on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "cvs: upload own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "cvs: update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "cvs: delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- interview-recordings and proctoring-snapshots have no policies on purpose:
-- only the server (service role) can read or write them.
