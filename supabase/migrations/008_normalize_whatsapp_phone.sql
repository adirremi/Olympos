-- 008_normalize_whatsapp_phone.sql
-- Store Israeli mobile numbers in the WhatsApp Cloud API format:
-- 9725XXXXXXXX.

update public.users
set phone = '972' || substring(regexp_replace(phone, '\D', '', 'g') from 2)
where phone is not null
  and regexp_replace(phone, '\D', '', 'g') ~ '^05[0-9]{8}$';

update public.users
set phone = regexp_replace(phone, '\D', '', 'g')
where phone is not null
  and regexp_replace(phone, '\D', '', 'g') ~ '^9725[0-9]{8}$';
