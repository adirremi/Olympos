create or replace function public.week_start_sunday(p_date date default current_date)
returns date
language sql
immutable
as $$
  select p_date - extract(dow from p_date)::int;
$$;

create or replace function public.generate_week_for_user(
  p_user_id uuid,
  p_start_date date default public.week_start_sunday(current_date)
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cohort_id uuid;
  v_plan record;
  v_log_id uuid;
  v_send_date date;
begin
  select e.cohort_id into v_cohort_id
  from public.enrollments e
  where e.user_id = p_user_id
    and e.status = 'active';

  if v_cohort_id is null then
    raise exception 'No active cohort found for user %', p_user_id;
  end if;

  for v_plan in
    select *
    from public.training_plans
    where cohort_id = v_cohort_id
      and week_number = 1
    order by day_in_week
  loop
    v_send_date := p_start_date + (v_plan.day_in_week - 1);

    insert into public.training_log (
      user_id,
      plan_id,
      scheduled_for,
      workout_snapshot,
      status
    )
    values (
      p_user_id,
      v_plan.id,
      v_send_date,
      v_plan.details,
      'scheduled'
    )
    on conflict (user_id, scheduled_for) do update
    set plan_id = excluded.plan_id,
        workout_snapshot = excluded.workout_snapshot
    returning id into v_log_id;

    if v_plan.workout_type <> 'rest' then
      insert into public.scheduled_messages (
        user_id,
        training_log_id,
        send_at,
        template_key,
        variables
      )
      values
        (
          p_user_id,
          v_log_id,
          (v_send_date::timestamptz + time '07:00'),
          'morning_workout',
          jsonb_build_object('workout_name', v_plan.workout_name, 'link', '/today')
        ),
        (
          p_user_id,
          v_log_id,
          (v_send_date::timestamptz + time '09:00'),
          'workout_reminder_1',
          jsonb_build_object('workout_name', v_plan.workout_name)
        ),
        (
          p_user_id,
          v_log_id,
          (v_send_date::timestamptz + time '19:00'),
          'workout_reminder_last',
          jsonb_build_object('workout_name', v_plan.workout_name)
        )
      on conflict (user_id, training_log_id, template_key) do update
      set send_at = excluded.send_at,
          variables = excluded.variables,
          status = case
            when public.scheduled_messages.status in ('sent', 'cancelled')
              then public.scheduled_messages.status
            else 'pending'
          end;
    end if;
  end loop;
end;
$$;

create or replace function public.ensure_current_week_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_start date := public.week_start_sunday(current_date);
  v_existing_count int;
begin
  select count(*) into v_existing_count
  from public.training_log
  where user_id = p_user_id
    and scheduled_for >= v_week_start
    and scheduled_for < v_week_start + 7;

  if v_existing_count = 0 then
    perform public.generate_week_for_user(p_user_id, v_week_start);
  end if;
end;
$$;

create or replace function public.ensure_current_week_for_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_current_week_for_user(auth.uid());
end;
$$;

create or replace function public.generate_week_for_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.generate_week_for_user(auth.uid(), public.week_start_sunday(current_date));
end;
$$;
