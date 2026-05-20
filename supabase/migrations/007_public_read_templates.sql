-- 007_public_read_templates.sql
-- Allow authenticated trainees to read cohort metadata and training plan
-- templates. Templates are shared across an entire cohort, so a permissive
-- SELECT policy is acceptable. Writes remain restricted to service_role.

alter table public.cohorts enable row level security;
alter table public.training_plans enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cohorts'
      and policyname = 'authenticated can read cohorts'
  ) then
    create policy "authenticated can read cohorts"
    on public.cohorts for select
    to authenticated
    using (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'training_plans'
      and policyname = 'authenticated can read training plans'
  ) then
    create policy "authenticated can read training plans"
    on public.training_plans for select
    to authenticated
    using (true);
  end if;
end;
$$;

-- Make sure the role grants haven't been revoked. PostgREST also requires
-- table-level privileges in addition to RLS policies.
grant select on public.cohorts to authenticated, anon;
grant select on public.training_plans to authenticated, anon;
