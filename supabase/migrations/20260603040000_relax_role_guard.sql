-- prevent_role_escalation: SQL Editor / service_role 등 시스템 컨텍스트(auth.uid() = null
-- 또는 auth.role() = 'service_role')는 통과시킨다. 일반 인증 유저의 자기 승격만 차단.

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin(auth.uid()) then
    raise exception 'role change requires admin';
  end if;
  return new;
end;
$$;
