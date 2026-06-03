-- Initial schema: profiles, subscriber_roster, subscriptions, import_batches, posts
-- 권한 헬퍼 함수, 가입 트리거, 모든 테이블 RLS 정책 포함.
-- 정책 규약: CLAUDE.md §5.

------------------------------------------------------------
-- 1. Tables
------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'user' check (role in ('admin','user')),
  full_name  text,
  created_at timestamptz not null default now()
);

create table public.subscriber_roster (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  phone      text not null unique,
  email      text,
  user_id    uuid references public.profiles(id) on delete set null,
  raw        jsonb,
  updated_at timestamptz not null default now()
);

create index subscriber_roster_user_id_idx on public.subscriber_roster (user_id);
create index subscriber_roster_email_idx   on public.subscriber_roster (email);

create table public.subscriptions (
  id        uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.subscriber_roster(id) on delete cascade,
  user_id   uuid references public.profiles(id) on delete set null,
  year      int  not null,
  month     int  not null check (month between 1 and 12),
  status    text not null check (status in ('active','challenge','expired')),
  unique (roster_id, year, month)
);

create index subscriptions_user_period_idx on public.subscriptions (user_id, year, month);

create table public.import_batches (
  id         uuid primary key default gen_random_uuid(),
  source     text not null check (source in ('xlsx','google_sheet')),
  file_name  text,
  row_count  int,
  inserted   int,
  updated    int,
  skipped    int,
  errors     jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  content      text,
  category     text,
  is_published boolean not null default false,
  published_at timestamptz,
  author_id    uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index posts_published_at_idx on public.posts (published_at desc) where is_published;

------------------------------------------------------------
-- 2. Helper functions
--    RLS 정책 내부에서 호출되므로 SECURITY DEFINER + search_path 고정.
------------------------------------------------------------

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

create or replace function public.has_active_subscription(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions
    where user_id = uid
      and status = 'active'
      and year  = extract(year  from (now() at time zone 'utc'))::int
      and month = extract(month from (now() at time zone 'utc'))::int
  );
$$;

------------------------------------------------------------
-- 3. Signup trigger: auth.users insert -> profiles
------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- role 자기 승격 방지: 일반 유저는 자신의 role 컬럼을 바꿀 수 없음.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and not public.is_admin(auth.uid()) then
    raise exception 'role change requires admin';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

------------------------------------------------------------
-- 4. RLS — 모든 테이블 ON
------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.subscriber_roster enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.import_batches    enable row level security;
alter table public.posts             enable row level security;

-- profiles: 본인 row select/update. admin은 전체.
create policy "profiles select own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin(auth.uid()));

create policy "profiles update own or admin"
  on public.profiles for update
  using      (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));

-- subscriber_roster: admin 전용.
create policy "roster admin all"
  on public.subscriber_roster for all
  using      (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- import_batches: admin 전용.
create policy "import_batches admin all"
  on public.import_batches for all
  using      (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- subscriptions: 본인 select, 쓰기는 admin/RPC만.
create policy "subscriptions admin all"
  on public.subscriptions for all
  using      (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "subscriptions select own"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- posts: 발행 + 활성 구독자(또는 admin) select, 쓰기는 admin만.
create policy "posts admin all"
  on public.posts for all
  using      (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "posts select published with access"
  on public.posts for select
  using (is_published = true and public.has_active_subscription(auth.uid()));
