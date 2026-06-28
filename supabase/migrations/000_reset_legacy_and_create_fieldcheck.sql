-- =============================================================================
-- RESET: Remove legacy Olympos / mentor-app schema (safe / idempotent)
-- =============================================================================
-- Run once in Supabase Dashboard → SQL Editor
--
-- Safe even if legacy tables were never created or already deleted.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Stop WhatsApp cron jobs (skip if pg_cron not installed)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for r in
      select jobid, jobname
      from cron.job
      where jobname like 'whatsapp%'
    loop
      perform cron.unschedule(r.jobid);
      raise notice 'Unscheduled cron job: %', r.jobname;
    end loop;
  end if;
exception
  when undefined_table then
    raise notice 'cron.job not found — skipping cron cleanup';
  when others then
    raise notice 'Cron cleanup skipped: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Drop auth trigger (auth.users always exists)
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

-- ---------------------------------------------------------------------------
-- 3. Drop views
-- ---------------------------------------------------------------------------
drop view if exists public.user_performance_timeline cascade;
drop view if exists public.user_today_plan cascade;
drop view if exists public.user_week_plan cascade;
drop view if exists public.whatsapp_outbox_today cascade;

-- ---------------------------------------------------------------------------
-- 4. Drop ALL public tables (CASCADE removes triggers/policies automatically)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('drop table if exists public.%I cascade', r.tablename);
    raise notice 'Dropped table: %', r.tablename;
  end loop;
end $$;

-- Drop leftover enum types
drop type if exists public.check_in_status cascade;
drop type if exists public.check_in_cta_type cascade;

-- ---------------------------------------------------------------------------
-- 5. Drop legacy functions (dynamic — any signature)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'get_whatsapp_morning_outbox',
        'get_whatsapp_unfinished_reminders',
        'get_whatsapp_evening_outbox',
        'log_whatsapp_outbound',
        'log_whatsapp_inbound',
        'mark_training_from_whatsapp',
        'classify_monthly_performance',
        'submit_monthly_performance_test',
        'refresh_user_training_level',
        'refresh_all_training_levels',
        'check_recurring_pain_alert',
        'complete_onboarding',
        'current_day_in_week',
        'ensure_current_week_for_current_user',
        'ensure_current_week_for_user',
        'generate_week_for_current_user',
        'generate_week_for_user',
        'handle_new_user',
        'set_updated_at',
        'week_start_sunday'
      )
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
end $$;

-- =============================================================================
-- 6. Create FieldCheck base schema
-- =============================================================================

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index businesses_user_id_idx on public.businesses (user_id);

alter table public.businesses enable row level security;

create policy "Users can view own businesses"
  on public.businesses for select
  using (auth.uid() = user_id);

create policy "Users can insert own businesses"
  on public.businesses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own businesses"
  on public.businesses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own businesses"
  on public.businesses for delete
  using (auth.uid() = user_id);

create type public.check_in_status as enum ('draft', 'published', 'archived');
create type public.check_in_cta_type as enum ('call', 'whatsapp', 'website', 'none');

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_address text not null,
  lat double precision not null,
  lng double precision not null,
  description text,
  cta_type public.check_in_cta_type not null default 'none',
  status public.check_in_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index check_ins_business_id_idx on public.check_ins (business_id);
create index check_ins_status_idx on public.check_ins (status);

alter table public.check_ins enable row level security;

create policy "Users can view check-ins for own businesses"
  on public.check_ins for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = check_ins.business_id and b.user_id = auth.uid()
    )
  );

create policy "Users can insert check-ins for own businesses"
  on public.check_ins for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = check_ins.business_id and b.user_id = auth.uid()
    )
  );

create policy "Users can update check-ins for own businesses"
  on public.check_ins for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = check_ins.business_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = check_ins.business_id and b.user_id = auth.uid()
    )
  );

create policy "Users can delete check-ins for own businesses"
  on public.check_ins for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = check_ins.business_id and b.user_id = auth.uid()
    )
  );

create table public.check_in_media (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references public.check_ins (id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index check_in_media_check_in_id_idx on public.check_in_media (check_in_id);

alter table public.check_in_media enable row level security;

create policy "Users can view media for own check-ins"
  on public.check_in_media for select
  using (
    exists (
      select 1
      from public.check_ins c
      join public.businesses b on b.id = c.business_id
      where c.id = check_in_media.check_in_id and b.user_id = auth.uid()
    )
  );

create policy "Users can insert media for own check-ins"
  on public.check_in_media for insert
  with check (
    exists (
      select 1
      from public.check_ins c
      join public.businesses b on b.id = c.business_id
      where c.id = check_in_media.check_in_id and b.user_id = auth.uid()
    )
  );

create policy "Users can update media for own check-ins"
  on public.check_in_media for update
  using (
    exists (
      select 1
      from public.check_ins c
      join public.businesses b on b.id = c.business_id
      where c.id = check_in_media.check_in_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.check_ins c
      join public.businesses b on b.id = c.business_id
      where c.id = check_in_media.check_in_id and b.user_id = auth.uid()
    )
  );

create policy "Users can delete media for own check-ins"
  on public.check_in_media for delete
  using (
    exists (
      select 1
      from public.check_ins c
      join public.businesses b on b.id = c.business_id
      where c.id = check_in_media.check_in_id and b.user_id = auth.uid()
    )
  );

-- Verify
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;
