alter table public.user_profile
  add column if not exists gibush_date date,
  add column if not exists sayeret_day_date date,
  add column if not exists readiness_level int not null default 0
    check (readiness_level between 0 and 100);

drop function if exists public.complete_onboarding(
  uuid, text, text, text, text, text, jsonb, date
);

create or replace function public.complete_onboarding(
  p_user_id uuid,
  p_full_name text,
  p_phone text,
  p_region text,
  p_recruitment_target text,
  p_training_level text,
  p_questionnaire_data jsonb,
  p_target_event_date date,
  p_gibush_date date default null,
  p_sayeret_day_date date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cohort_id uuid;
begin
  select id into v_cohort_id
  from public.cohorts
  where training_level = p_training_level;

  if v_cohort_id is null then
    raise exception 'No cohort found for level %', p_training_level;
  end if;

  update public.users
  set full_name = p_full_name,
      phone = p_phone,
      region = p_region
  where id = p_user_id;

  insert into public.user_profile (
    user_id,
    recruitment_target,
    training_level,
    target_event_date,
    gibush_date,
    sayeret_day_date,
    questionnaire_data,
    health_declaration_signed_at
  )
  values (
    p_user_id,
    p_recruitment_target,
    p_training_level,
    p_target_event_date,
    p_gibush_date,
    p_sayeret_day_date,
    p_questionnaire_data,
    now()
  )
  on conflict (user_id) do update
  set recruitment_target = excluded.recruitment_target,
      training_level = excluded.training_level,
      target_event_date = excluded.target_event_date,
      gibush_date = excluded.gibush_date,
      sayeret_day_date = excluded.sayeret_day_date,
      questionnaire_data = excluded.questionnaire_data,
      health_declaration_signed_at = excluded.health_declaration_signed_at;

  update public.enrollments
  set cohort_id = v_cohort_id,
      status = 'active'
  where user_id = p_user_id;

  insert into public.training_log (
    user_id,
    scheduled_for,
    workout_snapshot,
    status
  )
  select
    p_user_id,
    current_date,
    jsonb_build_object(
      'name', 'אימון פתיחה',
      'tag', 'OPENING SESSION',
      'warmup', '5 דקות אופניים או ריצה קלה + תנועתיות מפרקים',
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'title', 'כוח עליון',
          'sets', '4 × 8',
          'rest', '60 שניות',
          'exercises', jsonb_build_array(
            'שכיבות סמיכה איטיות',
            'מתח או חתירה אופקית בגומיה'
          )
        ),
        jsonb_build_object(
          'title', 'רגליים',
          'sets', '3 × 12',
          'rest', '45 שניות',
          'exercises', jsonb_build_array(
            'סקוואט משקל גוף',
            'לאנצ׳ים מתחלפים'
          )
        ),
        jsonb_build_object(
          'title', 'מטקון קצר',
          'sets', '3 סבבים',
          'rest', '90 שניות',
          'exercises', jsonb_build_array(
            '200 מטר ריצה חזקה',
            '15 קפיצות בחבל',
            '10 בטן'
          )
        )
      ),
      'finisher', 'תליה על מתח עד כשל × 2',
      'cooldown', '5 דקות הליכה ומתיחות',
      'level', p_training_level
    ),
    'scheduled'
  where not exists (
    select 1 from public.training_log tl
    where tl.user_id = p_user_id
      and tl.scheduled_for = current_date
  );
end;
$$;
