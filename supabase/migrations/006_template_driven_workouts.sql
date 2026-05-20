create or replace function public.current_day_in_week(p_date date default current_date)
returns int
language sql
immutable
as $$
  select (extract(dow from p_date)::int) + 1;
$$;

create or replace view public.user_today_plan as
select
  u.id as user_id,
  e.cohort_id,
  c.training_level,
  tp.id as plan_id,
  tp.day_in_week,
  tp.workout_name,
  tp.workout_type,
  tp.details as workout_snapshot,
  tp.estimated_duration_minutes
from public.users u
join public.enrollments e on e.user_id = u.id and e.status = 'active'
join public.cohorts c on c.id = e.cohort_id
left join public.training_plans tp
  on tp.cohort_id = e.cohort_id
  and tp.week_number = 1
  and tp.day_in_week = public.current_day_in_week();

alter view public.user_today_plan set (security_invoker = on);

create or replace view public.user_week_plan as
select
  u.id as user_id,
  e.cohort_id,
  c.training_level,
  tp.day_in_week,
  tp.workout_name,
  tp.workout_type,
  tp.details as workout_snapshot,
  tp.estimated_duration_minutes
from public.users u
join public.enrollments e on e.user_id = u.id and e.status = 'active'
join public.cohorts c on c.id = e.cohort_id
join public.training_plans tp
  on tp.cohort_id = e.cohort_id
  and tp.week_number = 1;

alter view public.user_week_plan set (security_invoker = on);

create or replace view public.whatsapp_outbox_today as
select
  u.id as user_id,
  u.full_name,
  u.phone,
  c.training_level,
  tp.workout_name,
  tp.workout_type,
  tp.details as workout_snapshot,
  coalesce(tl.status, 'scheduled') as today_status
from public.users u
join public.enrollments e on e.user_id = u.id and e.status = 'active'
join public.cohorts c on c.id = e.cohort_id
left join public.training_plans tp
  on tp.cohort_id = e.cohort_id
  and tp.week_number = 1
  and tp.day_in_week = public.current_day_in_week()
left join public.training_log tl
  on tl.user_id = u.id
  and tl.scheduled_for = current_date;

grant select on public.user_today_plan to authenticated;
grant select on public.user_week_plan to authenticated;
grant select on public.whatsapp_outbox_today to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'training_log'
      and policyname = 'trainee can insert own training'
  ) then
    create policy "trainee can insert own training"
    on public.training_log for insert
    with check (auth.uid() = user_id);
  end if;
end;
$$;

delete from public.scheduled_messages where status = 'pending';
delete from public.training_log where status = 'scheduled';

drop function if exists public.generate_week_for_user(uuid, date);
drop function if exists public.ensure_current_week_for_user(uuid);
drop function if exists public.ensure_current_week_for_current_user();
drop function if exists public.generate_week_for_current_user();
drop function if exists public.week_start_sunday(date);
