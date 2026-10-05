-- Cria o armazenamento público das fotos das publicações.
-- Restringe o envio e a exclusão à pasta identificada pelo usuário autenticado.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 10485760, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "listing photos are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'listing-photos');

create policy "users upload photos to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete photos from their own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
