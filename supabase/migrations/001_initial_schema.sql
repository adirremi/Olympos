create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  full_name text,
  phone text unique,
  region text,
  role text not null default 'trainee'
    check (role in ('trainee', 'coach', 'head_coach', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  training_level text unique not null
    check (training_level in ('beginner', 'intermediate', 'advanced')),
  weekly_training_count int not null default 4,
  created_at timestamptz not null default now()
);

create table public.user_profile (
  user_id uuid primary key references public.users(id) on delete cascade,
  recruitment_target text not null,
  training_level text not null
    check (training_level in ('beginner', 'intermediate', 'advanced')),
  target_event_date date,
  questionnaire_data jsonb not null default '{}',
  health_declaration_signed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  cohort_id uuid references public.cohorts(id),
  coach_id uuid references public.users(id),
  status text not null default 'pending_questionnaire'
    check (status in ('pending_questionnaire', 'active', 'paused', 'completed', 'dropped')),
  enrolled_at timestamptz not null default now()
);

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  week_number int not null,
  day_in_week int not null check (day_in_week between 1 and 7),
  workout_name text not null,
  workout_type text not null default 'mixed',
  details jsonb not null default '{}',
  estimated_duration_minutes int,
  unique(cohort_id, week_number, day_in_week)
);

create table public.training_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid references public.training_plans(id),
  scheduled_for date not null,
  workout_snapshot jsonb not null default '{}',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'missed', 'skipped')),
  completed_at timestamptz,
  difficulty_rating int check (difficulty_rating between 1 and 5),
  feedback_text text,
  flags text[] not null default array[]::text[],
  created_at timestamptz not null default now()
);

create table public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  training_log_id uuid references public.training_log(id) on delete cascade,
  send_at timestamptz not null,
  template_key text not null,
  variables jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'cancelled')),
  whatsapp_message_id text,
  failure_reason text,
  retry_count int not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')),
  whatsapp_message_id text unique,
  phone_number text,
  body text,
  raw_payload jsonb not null default '{}',
  intent text,
  created_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now()
);

create index users_phone_idx on public.users(phone);
create index training_log_user_date_idx on public.training_log(user_id, scheduled_for);
create index scheduled_messages_pending_idx on public.scheduled_messages(send_at)
  where status = 'pending';
create index whatsapp_messages_user_created_idx on public.whatsapp_messages(user_id, created_at desc);
create index alerts_status_idx on public.alerts(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger user_profile_set_updated_at
before update on public.user_profile
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );

  insert into public.enrollments (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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
  )
  on conflict do nothing;
end;
$$;

alter table public.users enable row level security;
alter table public.user_profile enable row level security;
alter table public.enrollments enable row level security;
alter table public.training_log enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.alerts enable row level security;

create policy "trainee can read own user"
on public.users for select
using (auth.uid() = id);

create policy "trainee can update own user"
on public.users for update
using (auth.uid() = id);

create policy "trainee can manage own profile"
on public.user_profile for all
using (auth.uid() = user_id);

create policy "trainee can read own enrollment"
on public.enrollments for select
using (auth.uid() = user_id);

create policy "trainee can read own training"
on public.training_log for select
using (auth.uid() = user_id);

create policy "trainee can update own training"
on public.training_log for update
using (auth.uid() = user_id);

create policy "trainee can read own whatsapp"
on public.whatsapp_messages for select
using (auth.uid() = user_id);

create policy "trainee can read own alerts"
on public.alerts for select
using (auth.uid() = user_id);

insert into public.cohorts (name, training_level, weekly_training_count)
values
  ('הקבצה C', 'beginner', 3),
  ('הקבצה B', 'intermediate', 4),
  ('הקבצה A', 'advanced', 5)
on conflict (training_level) do nothing;
