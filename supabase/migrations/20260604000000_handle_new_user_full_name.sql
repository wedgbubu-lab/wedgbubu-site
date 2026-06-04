-- handle_new_user 트리거가 raw_user_meta_data.full_name도 추출해
-- profiles.full_name에 채우도록 보강.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email     text := new.email;
  v_name      text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  v_phone_raw text := coalesce(new.raw_user_meta_data->>'phone', '');
  v_phone     text := nullif(regexp_replace(v_phone_raw, '[-\s]', '', 'g'), '');
  v_roster_id uuid;
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, v_email, v_name, v_phone)
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
