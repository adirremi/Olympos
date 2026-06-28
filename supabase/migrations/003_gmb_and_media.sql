-- Phase 4: Google Business Profile fields + media storage

-- ---------------------------------------------------------------------------
-- businesses: support import from Google Business Profile
-- ---------------------------------------------------------------------------
alter table public.businesses
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'google')),
  add column if not exists address text,
  add column if not exists gmb_account_id text,
  add column if not exists gmb_location_id text,
  add column if not exists google_place_id text;

create unique index if not exists businesses_gmb_location_id_idx
  on public.businesses (gmb_location_id)
  where gmb_location_id is not null;

-- ---------------------------------------------------------------------------
-- check_in_media: images + videos, ordered gallery
-- ---------------------------------------------------------------------------
alter table public.check_in_media
  add column if not exists media_type text not null default 'image'
    check (media_type in ('image', 'video')),
  add column if not exists storage_path text,
  add column if not exists sort_order int not null default 0,
  add column if not exists file_size_bytes bigint,
  add column if not exists mime_type text;

-- ---------------------------------------------------------------------------
-- user Google Business tokens (server-role only — never expose to client)
-- ---------------------------------------------------------------------------
create table if not exists public.user_google_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);

revoke all on public.user_google_tokens from anon, authenticated;
grant all on public.user_google_tokens to service_role;

-- ---------------------------------------------------------------------------
-- Supabase Storage: check-in-media bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'check-in-media',
  'check-in-media',
  true,
  52428800, -- 50 MB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated users upload into their own folder: {user_id}/...
create policy "Users upload own check-in media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'check-in-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read check-in media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'check-in-media');

create policy "Public read check-in media"
  on storage.objects for select
  to anon
  using (bucket_id = 'check-in-media');

create policy "Users delete own check-in media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'check-in-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own check-in media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'check-in-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
