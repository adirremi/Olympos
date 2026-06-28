-- Phase 2: User profiles + platform connection skeleton
-- Phase 3+: business_invitations, token storage for social publish

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- platform_connections (metadata visible to owner; secrets in separate table)
-- ---------------------------------------------------------------------------
create table public.platform_connections (
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

create index platform_connections_business_id_idx
  on public.platform_connections (business_id);

alter table public.platform_connections enable row level security;

create policy "Users can view platform connections for own businesses"
  on public.platform_connections for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = platform_connections.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can insert platform connections for own businesses"
  on public.platform_connections for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = platform_connections.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can update platform connections for own businesses"
  on public.platform_connections for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = platform_connections.business_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = platform_connections.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can delete platform connections for own businesses"
  on public.platform_connections for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = platform_connections.business_id
        and b.user_id = auth.uid()
    )
  );

-- Tokens: service-role only (no authenticated RLS policies)
create table public.platform_connection_secrets (
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
-- business_invitations (Phase 3)
-- ---------------------------------------------------------------------------
create table public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  token uuid not null default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, email)
);

create index business_invitations_email_idx
  on public.business_invitations (lower(email));

alter table public.business_invitations enable row level security;

create policy "Business owners can manage invitations"
  on public.business_invitations for all
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_invitations.business_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_invitations.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Invitees can view own pending invitations"
  on public.business_invitations for select
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- ---------------------------------------------------------------------------
-- business_members (multi-user access after invite accepted)
-- ---------------------------------------------------------------------------
create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index business_members_user_id_idx on public.business_members (user_id);

alter table public.business_members enable row level security;

create policy "Members can view own memberships"
  on public.business_members for select
  using (auth.uid() = user_id);

create policy "Business owners can view all members"
  on public.business_members for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_members.business_id
        and b.user_id = auth.uid()
    )
  );

-- Extend businesses RLS: owners OR members can read
drop policy if exists "Users can view own businesses" on public.businesses;

create policy "Users can view own or member businesses"
  on public.businesses for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = businesses.id
        and bm.user_id = auth.uid()
    )
  );
