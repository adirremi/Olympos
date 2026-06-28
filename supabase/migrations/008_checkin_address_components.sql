-- Phase: store address components on check-ins for the widget map + post overlays.

alter table public.check_ins
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists country text;
