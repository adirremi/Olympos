-- 012_performance_timeline_view.sql
-- Unified performance timeline:
--   1. onboarding baseline from user_profile.questionnaire_data
--   2. monthly tests from monthly_performance_tests
--
-- This gives every trainee a full performance picture from day one.

create or replace view public.user_performance_timeline as
select
  up.user_id,
  'baseline'::text as source,
  u.created_at::date as assessment_date,
  date_trunc('month', u.created_at)::date as assessment_month,
  round(((up.questionnaire_data ->> 'run2kMinutes')::numeric * 60))::int
    as run_2000_seconds,
  (up.questionnaire_data ->> 'maxPullups')::int as pullups,
  (up.questionnaire_data ->> 'maxPushups')::int as pushups,
  up.training_level as derived_training_level,
  u.created_at
from public.user_profile up
join public.users u on u.id = up.user_id
where up.questionnaire_data ? 'run2kMinutes'
  and up.questionnaire_data ? 'maxPullups'
  and up.questionnaire_data ? 'maxPushups'

union all

select
  mpt.user_id,
  'monthly'::text as source,
  mpt.test_month as assessment_date,
  mpt.test_month as assessment_month,
  mpt.run_2000_seconds,
  mpt.pullups,
  mpt.pushups,
  mpt.derived_training_level,
  mpt.created_at
from public.monthly_performance_tests mpt;

alter view public.user_performance_timeline set (security_invoker = on);
