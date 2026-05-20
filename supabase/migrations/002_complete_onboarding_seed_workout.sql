create or replace function public.complete_onboarding(
  p_user_id uuid,
  p_full_name text,
  p_phone text,
  p_region text,
  p_recruitment_target text,
  p_training_level text,
  p_questionnaire_data jsonb,
  p_target_event_date date
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
    questionnaire_data,
    health_declaration_signed_at
  )
  values (
    p_user_id,
    p_recruitment_target,
    p_training_level,
    p_target_event_date,
    p_questionnaire_data,
    now()
  )
  on conflict (user_id) do update
  set recruitment_target = excluded.recruitment_target,
      training_level = excluded.training_level,
      target_event_date = excluded.target_event_date,
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
  values (
    p_user_id,
    current_date,
    jsonb_build_object(
      'name', 'אימון פתיחה',
      'warmup', '10 דקות ריצה קלה ותנועתיות',
      'main', '4 סטים: 800 מטר ריצה, 12 שכיבות סמיכה, 8 מתח או חתירה',
      'cooldown', '5 דקות הליכה ומתיחות',
      'level', p_training_level
    ),
    'scheduled'
  );
end;
$$;
