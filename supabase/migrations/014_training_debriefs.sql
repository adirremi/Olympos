-- 014: post-workout debrief (RPE, perceived pace, pain map, optional coach note)
-- Replaces the WhatsApp "ביצעתי / לא הספקתי" pipeline with an in-app post-mission debrief.

create table if not exists public.training_debriefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  training_log_id uuid not null references public.training_log(id) on delete cascade,
  rpe int not null check (rpe between 1 and 10),
  perceived_pace text not null
    check (perceived_pace in ('cant_keep_up', 'on_target', 'could_do_more')),
  has_pain boolean not null default false,
  pain_locations text[] not null default array[]::text[],
  coach_note text,
  created_at timestamptz not null default now(),
  unique (training_log_id)
);

create index if not exists training_debriefs_user_created_idx
  on public.training_debriefs (user_id, created_at desc);

alter table public.training_debriefs enable row level security;

drop policy if exists "trainee can read own debriefs" on public.training_debriefs;
create policy "trainee can read own debriefs"
on public.training_debriefs for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "trainee can insert own debriefs" on public.training_debriefs;
create policy "trainee can insert own debriefs"
on public.training_debriefs for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "trainee can update own debriefs" on public.training_debriefs;
create policy "trainee can update own debriefs"
on public.training_debriefs for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Auto alert when same pain location is reported twice within the last 14 days
create or replace function public.check_recurring_pain_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count int;
begin
  if not new.has_pain or coalesce(array_length(new.pain_locations, 1), 0) = 0 then
    return new;
  end if;

  select count(*)
    into v_recent_count
  from public.training_debriefs td
  where td.user_id = new.user_id
    and td.has_pain
    and td.pain_locations && new.pain_locations
    and td.created_at >= now() - interval '14 days';

  if v_recent_count >= 2 then
    insert into public.alerts (user_id, type, severity, message)
    values (
      new.user_id,
      'recurring_pain',
      'high',
      'דווח על כאב חוזר ב: ' || array_to_string(new.pain_locations, ', ')
    );
  end if;

  return new;
end;
$$;

drop trigger if exists training_debriefs_pain_alert on public.training_debriefs;
create trigger training_debriefs_pain_alert
after insert on public.training_debriefs
for each row execute function public.check_recurring_pain_alert();
