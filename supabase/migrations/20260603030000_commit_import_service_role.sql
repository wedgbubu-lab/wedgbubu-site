-- commit_import: cron(service_role)도 통과시키도록 권한 게이트 완화.
-- 사용자 호출은 여전히 admin role만 통과.

create or replace function public.commit_import(
  p_source        text,
  p_file_name     text,
  p_roster        jsonb,
  p_subscriptions jsonb,
  p_warnings      jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_role      text := auth.role();
  v_batch_id  uuid;
  v_inserted  int := 0;
  v_updated   int := 0;
  v_skipped   int := 0;
  v_row_count int := 0;
begin
  if not (public.is_admin(v_uid) or v_role = 'service_role') then
    raise exception 'commit_import requires admin role or service_role';
  end if;

  with input_roster as (
    select
      (r->>'phone')                  as phone,
      (r->>'name')                   as name,
      nullif(r->>'email', '')        as email
    from jsonb_array_elements(coalesce(p_roster, '[]'::jsonb)) as r
    where (r->>'phone') is not null
  ),
  existing as (
    select sr.phone, sr.name, sr.email
    from public.subscriber_roster sr
    where sr.phone in (select phone from input_roster)
  ),
  diff as (
    select
      coalesce(sum(case when e.phone is null then 1 else 0 end), 0)::int as ins,
      coalesce(sum(case when e.phone is not null and (
            coalesce(e.name,'')  <> coalesce(i.name,'')
         or coalesce(e.email,'') <> coalesce(i.email,'')
      ) then 1 else 0 end), 0)::int as upd,
      coalesce(sum(case when e.phone is not null and (
            coalesce(e.name,'')  =  coalesce(i.name,'')
        and coalesce(e.email,'') =  coalesce(i.email,'')
      ) then 1 else 0 end), 0)::int as same,
      count(*)::int as total
    from input_roster i
    left join existing e on e.phone = i.phone
  )
  select ins, upd, same, total
    into v_inserted, v_updated, v_skipped, v_row_count
    from diff;

  insert into public.subscriber_roster (name, phone, email, raw, updated_at)
  select
    (r->>'name'),
    (r->>'phone'),
    nullif(r->>'email', ''),
    coalesce(r->'raw', '{}'::jsonb),
    now()
  from jsonb_array_elements(coalesce(p_roster, '[]'::jsonb)) as r
  where (r->>'phone') is not null
  on conflict (phone) do update
    set name       = excluded.name,
        email      = excluded.email,
        raw        = excluded.raw,
        updated_at = now();

  update public.subscriber_roster sr
     set user_id = p.id
    from public.profiles p
   where sr.user_id is null
     and sr.phone in (
       select (r->>'phone')
       from jsonb_array_elements(coalesce(p_roster, '[]'::jsonb)) as r
       where (r->>'phone') is not null
     )
     and (
          (p.phone is not null and p.phone = sr.phone)
       or (p.email is not null and sr.email is not null and p.email = sr.email)
     );

  insert into public.subscriptions (roster_id, user_id, year, month, status)
  select
    sr.id,
    sr.user_id,
    (s->>'year')::int,
    (s->>'month')::int,
    (s->>'status')
  from jsonb_array_elements(coalesce(p_subscriptions, '[]'::jsonb)) as s
  join public.subscriber_roster sr on sr.phone = (s->>'phone')
  on conflict (roster_id, year, month) do update
    set status  = excluded.status,
        user_id = excluded.user_id;

  insert into public.import_batches (
    source, file_name, row_count, inserted, updated, skipped, errors, created_by
  ) values (
    p_source,
    nullif(p_file_name, ''),
    v_row_count + coalesce(jsonb_array_length(coalesce(p_warnings, '[]'::jsonb)), 0),
    v_inserted,
    v_updated,
    v_skipped,
    case
      when jsonb_array_length(coalesce(p_warnings, '[]'::jsonb)) > 0
        then jsonb_build_object('warnings', p_warnings)
      else null
    end,
    v_uid
  )
  returning id into v_batch_id;

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'inserted', v_inserted,
    'updated',  v_updated,
    'skipped',  v_skipped
  );
end;
$$;

grant execute on function public.commit_import(text, text, jsonb, jsonb, jsonb)
  to authenticated, service_role;
