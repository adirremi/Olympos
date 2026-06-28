-- Phase: Public widget — read published check-ins + media without auth.
-- Uses a SECURITY DEFINER RPC so we expose ONLY published data, controlled shape.

create or replace function public.get_widget_data(p_business_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'business', (
      select json_build_object('id', b.id, 'name', b.name)
      from public.businesses b
      where b.id = p_business_id
    ),
    'check_ins', coalesce((
      select json_agg(row_to_json(t) order by t.created_at desc)
      from (
        select
          c.id,
          c.full_address,
          c.lat,
          c.lng,
          c.description,
          c.cta_type,
          c.created_at,
          coalesce((
            select json_agg(
              json_build_object(
                'url', m.image_url,
                'type', m.media_type
              )
              order by m.sort_order
            )
            from public.check_in_media m
            where m.check_in_id = c.id
          ), '[]'::json) as media
        from public.check_ins c
        where c.business_id = p_business_id
          and c.status = 'published'
      ) t
    ), '[]'::json)
  );
$$;

grant execute on function public.get_widget_data(uuid) to anon, authenticated;
