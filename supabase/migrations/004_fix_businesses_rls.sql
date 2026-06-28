-- Fix: infinite recursion between businesses <-> business_members RLS policies
--
-- Cause: businesses SELECT checked business_members, and business_members SELECT
-- checked businesses → Postgres error 42P17 infinite recursion.
--
-- Fix: use a SECURITY DEFINER helper that bypasses RLS for ownership checks.

create or replace function public.user_can_access_business(p_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
  );
$$;

revoke all on function public.user_can_access_business(uuid) from public;
grant execute on function public.user_can_access_business(uuid) to authenticated;

-- businesses
drop policy if exists "Users can view own businesses" on public.businesses;
drop policy if exists "Users can view own or member businesses" on public.businesses;

create policy "Users can view accessible businesses"
  on public.businesses for select
  using (
    auth.uid() = user_id
    or public.user_can_access_business(id)
  );

-- business_members (remove policy that re-queries businesses with RLS)
drop policy if exists "Business owners can view all members" on public.business_members;

create policy "Accessible users can view business members"
  on public.business_members for select
  using (public.user_can_access_business(business_id));
