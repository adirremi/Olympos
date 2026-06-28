-- Phase: record every publish attempt (where, when, success/error, post id).

create table if not exists public.check_in_publications (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references public.check_ins (id) on delete cascade,
  provider text not null,
  status text not null check (status in ('success', 'error')),
  external_id text,
  error text,
  caption text,
  image_url text,
  published_at timestamptz not null default now()
);

create index if not exists check_in_publications_check_in_id_idx
  on public.check_in_publications (check_in_id);

alter table public.check_in_publications enable row level security;

drop policy if exists "Owners can view publications" on public.check_in_publications;
create policy "Owners can view publications"
  on public.check_in_publications for select
  using (
    exists (
      select 1
      from public.check_ins c
      join public.businesses b on b.id = c.business_id
      where c.id = check_in_publications.check_in_id
        and b.user_id = auth.uid()
    )
  );

-- Writes happen via the service-role admin client (RLS bypassed).
grant all on public.check_in_publications to service_role;
