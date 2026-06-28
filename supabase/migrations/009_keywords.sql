-- Phase: keywords for SEO/hashtags on businesses and per check-in.

alter table public.businesses
  add column if not exists keywords text[] not null default array[]::text[];

alter table public.check_ins
  add column if not exists keywords text[] not null default array[]::text[];
