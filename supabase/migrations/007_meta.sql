-- Phase: Meta (Facebook + Instagram) integration.
-- Stores the long-lived Meta USER access token per user (service-role only).
-- Per-page tokens are stored in platform_connection_secrets (created in 002/005).

create table if not exists public.user_meta_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  token_expires_at timestamptz,
  scopes text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);

revoke all on public.user_meta_tokens from anon, authenticated;
grant all on public.user_meta_tokens to service_role;
