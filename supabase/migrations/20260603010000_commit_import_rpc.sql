-- commit_import: 명부 파싱 결과를 원자적으로 반영하는 RPC.
-- 입력 JSON 구조:
--   p_roster:        [{ name, phone, email, raw }, ...]
--   p_subscriptions: [{ phone, year, month, status }, ...]   (status: active|challenge|expired)
--   p_warnings:      ParseWarning[] (자유 형태 jsonb)
-- 반환: { batch_id, inserted, updated, skipped }
-- PL/pgSQL 함수는 단일 트랜잭션에서 실행되므로 어느 단계든 실패 시 전체 롤백된다.

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

  -- 1) 입력 명부와 기존 명부를 phone 기준으로 비교해 신규/갱신/동일 카운트.
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

  -- 2) subscriber_roster upsert (phone 기준 idempotent).
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

  -- 3) subscriptions upsert ((roster_id, year, month) 기준 idempotent).
  --    phone -> roster_id 조인으로 매칭 후 user_id도 함께 채운다.
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

  -- 4) 감사 로그.
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

revoke all on function public.commit_import(text, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.commit_import(text, text, jsonb, jsonb, jsonb) to authenticated;
