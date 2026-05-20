-- 009_whatsapp_pipeline.sql
-- WhatsApp send/receive pipeline:
--   - pg_cron / pg_net extensions (for scheduled Edge Function calls)
--   - RPCs used by Edge Functions (service_role only)

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Morning outbox (07:00)
-- ---------------------------------------------------------------------------

create or replace function public.get_whatsapp_morning_outbox()
returns table (
  user_id uuid,
  phone text,
  full_name text,
  workout_name text,
  workout_type text,
  workout_snapshot jsonb,
  target_event_date date,
  gibush_date date,
  sayeret_day_date date
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.phone,
    u.full_name,
    tp.workout_name,
    tp.workout_type,
    tp.details,
    up.target_event_date,
    up.gibush_date,
    up.sayeret_day_date
  from public.users u
  join public.user_profile up on up.user_id = u.id
  join public.enrollments e on e.user_id = u.id and e.status = 'active'
  join public.training_plans tp
    on tp.cohort_id = e.cohort_id
   and tp.week_number = 1
   and tp.day_in_week = extract(dow from current_date)::int + 1
  left join public.training_log tl
    on tl.user_id = u.id
   and tl.scheduled_for = current_date
  where u.phone is not null
    and u.phone ~ '^9725[0-9]{8}$'
    and (tl.id is null or tl.status = 'scheduled')
  order by u.created_at asc;
$$;

revoke all on function public.get_whatsapp_morning_outbox() from public, anon, authenticated;
grant execute on function public.get_whatsapp_morning_outbox() to service_role;

-- ---------------------------------------------------------------------------
-- Mid-morning reminder (09:00) – only trainees who got 07:00 message and
-- haven't marked completion yet.
-- ---------------------------------------------------------------------------

create or replace function public.get_whatsapp_unfinished_reminders()
returns table (
  user_id uuid,
  phone text,
  full_name text,
  workout_name text,
  workout_type text,
  workout_snapshot jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.phone,
    u.full_name,
    tp.workout_name,
    tp.workout_type,
    tp.details
  from public.users u
  join public.user_profile up on up.user_id = u.id
  join public.enrollments e on e.user_id = u.id and e.status = 'active'
  join public.training_plans tp
    on tp.cohort_id = e.cohort_id
   and tp.week_number = 1
   and tp.day_in_week = extract(dow from current_date)::int + 1
  left join public.training_log tl
    on tl.user_id = u.id
   and tl.scheduled_for = current_date
  where u.phone is not null
    and u.phone ~ '^9725[0-9]{8}$'
    and (tl.id is null or tl.status = 'scheduled')
    and exists (
      select 1
      from public.whatsapp_messages wm
      where wm.user_id = u.id
        and wm.direction = 'outbound'
        and wm.intent = 'morning_workout'
        and wm.created_at::date = current_date
    );
$$;

revoke all on function public.get_whatsapp_unfinished_reminders() from public, anon, authenticated;
grant execute on function public.get_whatsapp_unfinished_reminders() to service_role;

-- ---------------------------------------------------------------------------
-- Evening reminder (19:00) – workout still open + upcoming events.
-- ---------------------------------------------------------------------------

create or replace function public.get_whatsapp_evening_outbox()
returns table (
  user_id uuid,
  phone text,
  full_name text,
  workout_name text,
  workout_type text,
  workout_snapshot jsonb,
  days_to_enlistment int,
  days_to_gibush int,
  days_to_sayeret int
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.phone,
    u.full_name,
    tp.workout_name,
    tp.workout_type,
    tp.details,
    case when up.target_event_date is not null
         then (up.target_event_date - current_date) end,
    case when up.gibush_date is not null
         then (up.gibush_date - current_date) end,
    case when up.sayeret_day_date is not null
         then (up.sayeret_day_date - current_date) end
  from public.users u
  join public.user_profile up on up.user_id = u.id
  join public.enrollments e on e.user_id = u.id and e.status = 'active'
  join public.training_plans tp
    on tp.cohort_id = e.cohort_id
   and tp.week_number = 1
   and tp.day_in_week = extract(dow from current_date)::int + 1
  left join public.training_log tl
    on tl.user_id = u.id
   and tl.scheduled_for = current_date
  where u.phone is not null
    and u.phone ~ '^9725[0-9]{8}$'
    and (tl.id is null or tl.status = 'scheduled');
$$;

revoke all on function public.get_whatsapp_evening_outbox() from public, anon, authenticated;
grant execute on function public.get_whatsapp_evening_outbox() to service_role;

-- ---------------------------------------------------------------------------
-- Log every outbound WhatsApp message sent by the Edge Function.
-- ---------------------------------------------------------------------------

create or replace function public.log_whatsapp_outbound(
  p_user_id uuid,
  p_phone_number text,
  p_body text,
  p_intent text,
  p_whatsapp_message_id text default null,
  p_raw_payload jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.whatsapp_messages (
    user_id,
    direction,
    whatsapp_message_id,
    phone_number,
    body,
    raw_payload,
    intent
  )
  values (
    p_user_id,
    'outbound',
    p_whatsapp_message_id,
    p_phone_number,
    p_body,
    p_raw_payload,
    p_intent
  )
  on conflict (whatsapp_message_id) do nothing;
$$;

revoke all on function public.log_whatsapp_outbound(
  uuid, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.log_whatsapp_outbound(
  uuid, text, text, text, text, jsonb
) to service_role;

-- ---------------------------------------------------------------------------
-- Inbound webhook: log incoming message + (optionally) update training_log
-- when the trainee tapped a button reply.
-- ---------------------------------------------------------------------------

create or replace function public.log_whatsapp_inbound(
  p_phone_number text,
  p_body text,
  p_whatsapp_message_id text default null,
  p_raw_payload jsonb default '{}'::jsonb,
  p_intent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_id uuid;
begin
  select id into v_user_id
  from public.users
  where phone = p_phone_number
  limit 1;

  insert into public.whatsapp_messages (
    user_id,
    direction,
    whatsapp_message_id,
    phone_number,
    body,
    raw_payload,
    intent
  )
  values (
    v_user_id,
    'inbound',
    p_whatsapp_message_id,
    p_phone_number,
    p_body,
    p_raw_payload,
    p_intent
  )
  on conflict (whatsapp_message_id) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_whatsapp_inbound(
  text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.log_whatsapp_inbound(
  text, text, text, jsonb, text
) to service_role;

-- ---------------------------------------------------------------------------
-- Mark today's workout for a trainee identified by phone number.
-- Used when the trainee replies "completed" / "missed" on WhatsApp.
-- ---------------------------------------------------------------------------

create or replace function public.mark_training_from_whatsapp(
  p_phone_number text,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_cohort_id uuid;
  v_plan public.training_plans%rowtype;
  v_day int;
begin
  if p_status not in ('completed', 'missed') then
    raise exception 'invalid status: %', p_status;
  end if;

  select id into v_user_id
  from public.users
  where phone = p_phone_number
  limit 1;

  if v_user_id is null then
    return false;
  end if;

  select cohort_id into v_cohort_id
  from public.enrollments
  where user_id = v_user_id
    and status = 'active'
  limit 1;

  if v_cohort_id is null then
    return false;
  end if;

  v_day := extract(dow from current_date)::int + 1;

  select * into v_plan
  from public.training_plans
  where cohort_id = v_cohort_id
    and week_number = 1
    and day_in_week = v_day
  limit 1;

  insert into public.training_log (
    user_id,
    plan_id,
    scheduled_for,
    workout_snapshot,
    status,
    completed_at
  )
  values (
    v_user_id,
    v_plan.id,
    current_date,
    coalesce(v_plan.details, '{}'::jsonb),
    p_status,
    case when p_status = 'completed' then now() else null end
  )
  on conflict (user_id, scheduled_for)
  do update set
    status = excluded.status,
    completed_at = excluded.completed_at,
    plan_id = coalesce(excluded.plan_id, public.training_log.plan_id),
    workout_snapshot = case
      when public.training_log.workout_snapshot = '{}'::jsonb
        then excluded.workout_snapshot
      else public.training_log.workout_snapshot
    end;

  return true;
end;
$$;

revoke all on function public.mark_training_from_whatsapp(text, text)
  from public, anon, authenticated;
grant execute on function public.mark_training_from_whatsapp(text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Make sure training_log has the unique constraint required by the upsert
-- above (user_id + scheduled_for).
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'training_log_user_scheduled_uniq'
  ) then
    create unique index training_log_user_scheduled_uniq
      on public.training_log(user_id, scheduled_for);
  end if;
end;
$$;
