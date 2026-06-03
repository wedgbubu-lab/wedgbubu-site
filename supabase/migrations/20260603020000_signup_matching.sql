-- Phase 10: 가입 시 명부 자동 매칭.
-- 변경 사항:
--   1) profiles.phone 컬럼 추가 (NULLABLE, 가입 시 메타데이터에서 채움)
--   2) handle_new_user 트리거 교체: phone(우선) → email로 subscriber_roster 매칭,
--      해당 roster.user_id와 매칭된 month의 subscriptions.user_id를 채움
--   3) 기존 가입 유저에 대해 1회성 backfill
--   4) commit_import RPC 갱신: roster upsert 후 profiles와 phone/email로 자동 매칭

------------------------------------------------------------
-- 1) profiles.phone
------------------------------------------------------------

alter table public.profiles add column if not exists phone text;

------------------------------------------------------------
-- 2) handle_new_user — 명부 자동 매칭 포함
------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email     text := new.email;
  v_phone_raw text := coalesce(new.raw_user_meta_data->>'phone', '');
  v_phone     text := nullif(regexp_replace(v_phone_raw, '[-\s]', '', 'g'), '');
  v_roster_id uuid;
begin
  insert into public.profiles (id, email, phone)
  values (new.id, v_email, v_phone)
  on conflict (id) do nothing;

  if v_phone is null and v_email is null then
    return new;
  end if;

  -- 매칭 우선순위: 정규화된 phone 일치 > email 일치.
  select id into v_roster_id
  from public.subscriber_roster
  where (v_phone is not null and phone = v_phone)
     or (v_email is not null and email = v_email)
  order by
    case when v_phone is not null and phone = v_phone then 0 else 1 end,
    updated_at desc
  limit 1;

  if v_roster_id is not null then
    update public.subscriber_roster
       set user_id    = new.id,
           updated_at = now()
     where id = v_roster_id
       and (user_id is null or user_id <> new.id);

    update public.subscriptions
       set user_id = new.id
     where roster_id = v_roster_id
       and (user_id is null or user_id <> new.id);
  end if;

  return new;
end;
$$;

------------------------------------------------------------
-- 3) 기존 유저 1회성 backfill (email/phone 모두 시도)
------------------------------------------------------------

update public.subscriber_roster sr
   set user_id = p.id,
       updated_at = now()
  from public.profiles p
 where sr.user_id is null
   and (
        (p.phone is not null and sr.phone = p.phone)
     or (p.email is not null and sr.email is not null and sr.email = p.email)
   );

update public.subscriptions s
   set user_id = sr.user_id
  from public.subscriber_roster sr
 where s.roster_id = sr.id
   and s.user_id is null
   and sr.user_id is not null;

------------------------------------------------------------
-- 4) commit_import RPC: roster upsert 후 profiles 자동 매칭
------------------------------------------------------------

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
  v_batch_id  uuid;
  v_inserted  int := 0;
  v_updated   int := 0;
  v_skipped   int := 0;
  v_row_count int := 0;
begin
  if not public.is_admin(v_uid) then
    raise exception 'commit_import requires admin role';
  end if;

  -- diff
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

  -- subscriber_roster upsert
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

  -- 이번 배치의 미매칭 roster를 profiles와 phone/email 기준으로 매칭.
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

  -- subscriptions upsert
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

  -- 감사 로그
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
