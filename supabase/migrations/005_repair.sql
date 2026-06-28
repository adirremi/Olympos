-- =============================================================================
-- 005_repair.sql — Idempotent repair (safe to run multiple times)
-- =============================================================================
-- Run this ONE file in Supabase SQL Editor. It fixes partial migrations of
-- 002 / 003 / 004 without "already exists" errors.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- platform_connections
-- ---------------------------------------------------------------------------
create table if not exists public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  provider text not null
    check (provider in ('gmb', 'facebook', 'instagram', 'youtube')),
  account_id text,
  account_name text,
  status text not null default 'disconnected'
    check (status in ('disconnected', 'connected', 'expired', 'error')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, provider)
);

create index if not exists platform_connections_business_id_idx
  on public.platform_connections (business_id);

alter table public.platform_connections enable row level security;

drop policy if exists "Users can view platform connections for own businesses" on public.platform_connections;
create policy "Users can view platform connections for own businesses"
  on public.platform_connections for select
  using (exists (select 1 from public.businesses b
    where b.id = platform_connections.business_id and b.user_id = auth.uid()));

drop policy if exists "Users can insert platform connections for own businesses" on public.platform_connections;
create policy "Users can insert platform connections for own businesses"
  on public.platform_connections for insert
  with check (exists (select 1 from public.businesses b
    where b.id = platform_connections.business_id and b.user_id = auth.uid()));

drop policy if exists "Users can update platform connections for own businesses" on public.platform_connections;
create policy "Users can update platform connections for own businesses"
  on public.platform_connections for update
  using (exists (select 1 from public.businesses b
    where b.id = platform_connections.business_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b
    where b.id = platform_connections.business_id and b.user_id = auth.uid()));

drop policy if exists "Users can delete platform connections for own businesses" on public.platform_connections;
create policy "Users can delete platform connections for own businesses"
  on public.platform_connections for delete
  using (exists (select 1 from public.businesses b
    where b.id = platform_connections.business_id and b.user_id = auth.uid()));

-- platform_connection_secrets (service-role only)
create table if not exists public.platform_connection_secrets (
  connection_id uuid primary key
    references public.platform_connections (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on public.platform_connection_secrets from anon, authenticated;
grant all on public.platform_connection_secrets to service_role;

-- ---------------------------------------------------------------------------
-- business_invitations
-- ---------------------------------------------------------------------------
create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  token uuid not null default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, email)
);

create index if not exists business_invitations_email_idx
  on public.business_invitations (lower(email));

alter table public.business_invitations enable row level security;

drop policy if exists "Business owners can manage invitations" on public.business_invitations;
create policy "Business owners can manage invitations"
  on public.business_invitations for all
  using (exists (select 1 from public.businesses b
    where b.id = business_invitations.business_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b
    where b.id = business_invitations.business_id and b.user_id = auth.uid()));

drop policy if exists "Invitees can view own pending invitations" on public.business_invitations;
create policy "Invitees can view own pending invitations"
  on public.business_invitations for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ---------------------------------------------------------------------------
-- business_members
-- ---------------------------------------------------------------------------
create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists business_members_user_id_idx
  on public.business_members (user_id);

alter table public.business_members enable row level security;

drop policy if exists "Members can view own memberships" on public.business_members;
create policy "Members can view own memberships"
  on public.business_members for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- businesses: Google Business columns (003)
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
-- check_in_media: media columns (003)
-- ---------------------------------------------------------------------------
alter table public.check_in_media
  add column if not exists media_type text not null default 'image'
    check (media_type in ('image', 'video')),
  add column if not exists storage_path text,
  add column if not exists sort_order int not null default 0,
  add column if not exists file_size_bytes bigint,
  add column if not exists mime_type text;

-- ---------------------------------------------------------------------------
-- user_google_tokens (003)
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
-- Storage bucket + policies (003)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'check-in-media', 'check-in-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own check-in media" on storage.objects;
create policy "Users upload own check-in media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'check-in-media'
    and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users read check-in media" on storage.objects;
create policy "Users read check-in media"
  on storage.objects for select to authenticated
  using (bucket_id = 'check-in-media');

drop policy if exists "Public read check-in media" on storage.objects;
create policy "Public read check-in media"
  on storage.objects for select to anon
  using (bucket_id = 'check-in-media');

drop policy if exists "Users delete own check-in media" on storage.objects;
create policy "Users delete own check-in media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'check-in-media'
    and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update own check-in media" on storage.objects;
create policy "Users update own check-in media"
  on storage.objects for update to authenticated
  using (bucket_id = 'check-in-media'
    and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Fix infinite recursion (004): businesses <-> business_members
-- ---------------------------------------------------------------------------
create or replace function public.user_can_access_business(p_business_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.user_id = auth.uid()
  ) or exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id and bm.user_id = auth.uid()
  );
$$;

revoke all on function public.user_can_access_business(uuid) from public;
grant execute on function public.user_can_access_business(uuid) to authenticated;

drop policy if exists "Users can view own businesses" on public.businesses;
drop policy if exists "Users can view own or member businesses" on public.businesses;
drop policy if exists "Users can view accessible businesses" on public.businesses;
create policy "Users can view accessible businesses"
  on public.businesses for select
  using (auth.uid() = user_id or public.user_can_access_business(id));

drop policy if exists "Business owners can view all members" on public.business_members;
drop policy if exists "Accessible users can view business members" on public.business_members;
create policy "Accessible users can view business members"
  on public.business_members for select
  using (public.user_can_access_business(business_id));

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
select tablename from pg_tables where schemaname = 'public' order by tablename;
