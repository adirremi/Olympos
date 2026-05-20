-- 011_monthly_performance_tests.sql
-- Monthly performance tests drive cohort placement and progress analytics.

create table if not exists public.monthly_performance_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  test_month date not null,
  run_2000_seconds int not null check (run_2000_seconds > 0),
  pullups int not null check (pullups >= 0),
  pushups int not null check (pushups >= 0),
  derived_training_level text not null
    check (derived_training_level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, test_month)
);

alter table public.monthly_performance_tests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'monthly_performance_tests'
      and policyname = 'trainee can manage own monthly tests'
  ) then
    create policy "trainee can manage own monthly tests"
    on public.monthly_performance_tests for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;

create index if not exists monthly_performance_tests_user_month_idx
  on public.monthly_performance_tests(user_id, test_month desc);

drop trigger if exists monthly_performance_tests_updated_at
  on public.monthly_performance_tests;

create trigger monthly_performance_tests_updated_at
before update on public.monthly_performance_tests
for each row execute function public.set_updated_at();

create or replace function public.classify_monthly_performance(
  p_run_2000_seconds int,
  p_pullups int,
  p_pushups int
)
returns text
language sql
immutable
as $$
  select case
    when p_run_2000_seconds < 450
      and p_pullups > 15
      and p_pushups > 25
      then 'advanced'
    when p_run_2000_seconds >= 450
      and p_run_2000_seconds < 500
      and p_pullups > 10
      and p_pushups > 18
      then 'intermediate'
    else 'beginner'
  end;
$$;

create or replace function public.submit_monthly_performance_test(
  p_user_id uuid,
  p_test_month date,
  p_run_2000_seconds int,
  p_pullups int,
  p_pushups int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date;
  v_level text;
  v_cohort_id uuid;
begin
  if auth.uid() <> p_user_id then
    raise exception 'Unauthorized';
  end if;

  v_month := date_trunc('month', p_test_month)::date;
  v_level := public.classify_monthly_performance(
    p_run_2000_seconds,
    p_pullups,
    p_pushups
  );

  insert into public.monthly_performance_tests (
    user_id,
    test_month,
    run_2000_seconds,
    pullups,
    pushups,
    derived_training_level
  )
  values (
    p_user_id,
    v_month,
    p_run_2000_seconds,
    p_pullups,
    p_pushups,
    v_level
  )
  on conflict (user_id, test_month)
  do update set
    run_2000_seconds = excluded.run_2000_seconds,
    pullups = excluded.pullups,
    pushups = excluded.pushups,
    derived_training_level = excluded.derived_training_level;

  update public.user_profile
  set training_level = v_level,
      updated_at = now()
  where user_id = p_user_id;

  select id into v_cohort_id
  from public.cohorts
  where training_level = v_level;

  if v_cohort_id is not null then
    update public.enrollments
    set cohort_id = v_cohort_id,
        status = 'active'
    where user_id = p_user_id;
  end if;

  return v_level;
end;
$$;

revoke all on function public.submit_monthly_performance_test(
  uuid, date, int, int, int
) from public, anon;

grant execute on function public.submit_monthly_performance_test(
  uuid, date, int, int, int
) to authenticated;
