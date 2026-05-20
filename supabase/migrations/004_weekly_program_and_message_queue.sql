alter table public.scheduled_messages
  add column if not exists delivered_at timestamptz;

create unique index if not exists training_log_user_scheduled_for_idx
on public.training_log(user_id, scheduled_for);

create unique index if not exists scheduled_messages_unique_daily_template_idx
on public.scheduled_messages(user_id, training_log_id, template_key);

delete from public.training_plans;

with cohort_map as (
  select id, training_level from public.cohorts
)
insert into public.training_plans (
  cohort_id,
  week_number,
  day_in_week,
  workout_name,
  workout_type,
  estimated_duration_minutes,
  details
)
select
  c.id,
  1,
  plan.day_in_week,
  plan.workout_name,
  plan.workout_type,
  plan.duration,
  plan.details
from cohort_map c
cross join lateral (
  values
    (
      1,
      'DAY ONE · PUSH + RUN',
      'mixed',
      55,
      jsonb_build_object(
        'name', 'DAY ONE · דחיפה וריצה',
        'tag', upper(c.training_level) || ' · PUSH',
        'warmup', '8 דקות ריצה קלה + תנועתיות כתפיים',
        'blocks', jsonb_build_array(
          jsonb_build_object(
            'title', 'שכיבות סמיכה',
            'sets', case c.training_level when 'advanced' then '5 × 15' when 'intermediate' then '4 × 12' else '3 × 8' end,
            'rest', '60 שניות',
            'exercises', jsonb_build_array('שכיבות סמיכה נקיות', 'סט אחרון עד כשל טכני')
          ),
          jsonb_build_object(
            'title', 'ריצה קצובה',
            'sets', case c.training_level when 'advanced' then '5 × 600m' when 'intermediate' then '4 × 500m' else '3 × 400m' end,
            'rest', '90 שניות',
            'exercises', jsonb_build_array('קצב בינוני-גבוה', 'לא לפתוח מהר מדי')
          )
        ),
        'finisher', 'פלאנק 3 × 45 שניות',
        'cooldown', '5 דקות הליכה ומתיחות'
      )
    ),
    (
      2,
      'DAY TWO · LEGS',
      'strength',
      45,
      jsonb_build_object(
        'name', 'DAY TWO · רגליים',
        'tag', upper(c.training_level) || ' · LEGS',
        'warmup', '5 דקות אופניים + פתיחת ירכיים',
        'blocks', jsonb_build_array(
          jsonb_build_object(
            'title', 'סקוואט ולאנצ׳ים',
            'sets', case c.training_level when 'advanced' then '5 × 14' when 'intermediate' then '4 × 12' else '3 × 10' end,
            'rest', '60 שניות',
            'exercises', jsonb_build_array('סקוואט משקל גוף', 'לאנצ׳ים מתחלפים', 'Glute Bridge')
          )
        ),
        'finisher', '6 ספרינטים: 15 שניות חזק + 45 שניות קל',
        'cooldown', 'מתיחות תאומים וירך אחורית'
      )
    ),
    (
      3,
      'DAY THREE · PULL',
      'strength',
      50,
      jsonb_build_object(
        'name', 'DAY THREE · משיכה',
        'tag', upper(c.training_level) || ' · PULL',
        'warmup', '5 דקות ריצה קלה + תליה 20 שניות',
        'blocks', jsonb_build_array(
          jsonb_build_object(
            'title', 'מתח / חתירה',
            'sets', case c.training_level when 'advanced' then '6 × 6' when 'intermediate' then '5 × 4' else '4 × 3' end,
            'rest', '90 שניות',
            'exercises', jsonb_build_array('מתח נקי או מתח עם גומיה', 'חתירה בגומיה', 'Face Pull')
          )
        ),
        'finisher', 'תליה עד כשל × 2',
        'cooldown', 'שחרור גב וכתפיים'
      )
    ),
    (
      4,
      'DAY FOUR · ACTIVE REST',
      'rest',
      30,
      jsonb_build_object(
        'name', 'DAY FOUR · התאוששות פעילה',
        'tag', 'ACTIVE REST',
        'warmup', 'הליכה קלה',
        'blocks', jsonb_build_array(
          jsonb_build_object(
            'title', 'התאוששות',
            'sets', '30-45 דקות',
            'rest', 'ללא',
            'exercises', jsonb_build_array('הליכה', 'מתיחות', 'נשימה')
          )
        ),
        'finisher', 'אין. המטרה היא להגיע חד למחר',
        'cooldown', 'שינה מוקדמת'
      )
    ),
    (
      5,
      'DAY FIVE · METCON',
      'metcon',
      60,
      jsonb_build_object(
        'name', 'DAY FIVE · מטקון',
        'tag', upper(c.training_level) || ' · FULL BODY',
        'warmup', '5 דקות תנועה דינמית',
        'blocks', jsonb_build_array(
          jsonb_build_object(
            'title', 'המטקון',
            'sets', case c.training_level when 'advanced' then '5 סבבים' when 'intermediate' then '4 סבבים' else '3 סבבים' end,
            'rest', '90 שניות',
            'exercises', jsonb_build_array('100 קפיצות בחבל', '10 מתח או חתירה', '15 שכיבות סמיכה', '20 כפיפות בטן')
          )
        ),
        'finisher', '200 מטר ריצה חזקה',
        'cooldown', '5 דקות הליכה'
      )
    ),
    (
      6,
      'DAY SIX · LONG RUN',
      'cardio',
      45,
      jsonb_build_object(
        'name', 'DAY SIX · ריצת נפח',
        'tag', upper(c.training_level) || ' · RUN',
        'warmup', '8 דקות ריצה קלה',
        'blocks', jsonb_build_array(
          jsonb_build_object(
            'title', 'ריצת נפח',
            'sets', case c.training_level when 'advanced' then '7 ק״מ' when 'intermediate' then '5 ק״מ' else '3 ק״מ' end,
            'rest', 'קצב דיבור',
            'exercises', jsonb_build_array('לא לרוץ מהר', 'לשמור קצב אחיד', 'לסיים עם אוויר')
          )
        ),
        'finisher', '4 האצות קצרות של 60 מטר',
        'cooldown', 'הליכה ומתיחות'
      )
    ),
    (
      7,
      'DAY SEVEN · REST',
      'rest',
      20,
      jsonb_build_object(
        'name', 'DAY SEVEN · מנוחה',
        'tag', 'REST',
        'warmup', 'אין',
        'blocks', jsonb_build_array(
          jsonb_build_object(
            'title', 'תחזוקה',
            'sets', '20 דקות',
            'rest', 'ללא',
            'exercises', jsonb_build_array('הליכה קלה', 'מתיחות', 'בדיקת כאבים')
          )
        ),
        'finisher', 'הכנה מנטלית לשבוע הבא',
        'cooldown', 'שינה'
      )
    )
) as plan(day_in_week, workout_name, workout_type, duration, details)
where c.training_level in ('beginner', 'intermediate', 'advanced')
on conflict (cohort_id, week_number, day_in_week) do update
set workout_name = excluded.workout_name,
    workout_type = excluded.workout_type,
    estimated_duration_minutes = excluded.estimated_duration_minutes,
    details = excluded.details;

create or replace function public.generate_week_for_user(
  p_user_id uuid,
  p_start_date date default current_date
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

create or replace function public.generate_week_for_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.generate_week_for_user(auth.uid(), current_date);
end;
$$;
