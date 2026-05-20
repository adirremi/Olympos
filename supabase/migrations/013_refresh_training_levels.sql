-- 013_refresh_training_levels.sql
-- Refresh every trainee's cohort from the latest monthly test.
-- If no monthly test exists, use the onboarding baseline performance.

create or replace function public.refresh_user_training_level(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level text;
  v_cohort_id uuid;
begin
  select mpt.derived_training_level into v_level
  from public.monthly_performance_tests mpt
  where mpt.user_id = p_user_id
  order by mpt.test_month desc, mpt.updated_at desc
  limit 1;

  if v_level is null then
    select public.classify_monthly_performance(
      round(((up.questionnaire_data ->> 'run2kMinutes')::numeric * 60))::int,
      (up.questionnaire_data ->> 'maxPullups')::int,
      (up.questionnaire_data ->> 'maxPushups')::int
    )
    into v_level
    from public.user_profile up
    where up.user_id = p_user_id
      and up.questionnaire_data ? 'run2kMinutes'
      and up.questionnaire_data ? 'maxPullups'
      and up.questionnaire_data ? 'maxPushups';
  end if;

  if v_level is null then
    return null;
  end if;

  select id into v_cohort_id
  from public.cohorts
  where training_level = v_level;

  update public.user_profile
  set training_level = v_level,
      updated_at = now()
  where user_id = p_user_id;

  if v_cohort_id is not null then
    update public.enrollments
    set cohort_id = v_cohort_id,
        status = 'active'
    where user_id = p_user_id;
  end if;

  return v_level;
end;
$$;

create or replace function public.refresh_all_training_levels()
returns table (
  user_id uuid,
  full_name text,
  training_level text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    u.id,
    u.full_name,
    public.refresh_user_training_level(u.id) as training_level
  from public.users u
  join public.user_profile up on up.user_id = u.id
  order by u.created_at;
end;
$$;

revoke all on function public.refresh_user_training_level(uuid)
  from public, anon, authenticated;
revoke all on function public.refresh_all_training_levels()
  from public, anon, authenticated;

grant execute on function public.refresh_user_training_level(uuid) to service_role;
grant execute on function public.refresh_all_training_levels() to service_role;
