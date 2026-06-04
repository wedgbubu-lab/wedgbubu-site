-- 발행 게시물에 이미지 갤러리 지원.
--   1) posts.images jsonb (URL 배열)
--   2) post-images 버킷 (공개 읽기)
--   3) storage.objects RLS: 모두 select, admin만 insert/update/delete

------------------------------------------------------------
-- 1) posts.images
------------------------------------------------------------

alter table public.posts
  add column if not exists images jsonb not null default '[]'::jsonb;

------------------------------------------------------------
-- 2) Storage bucket
------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = excluded.public;

------------------------------------------------------------
-- 3) Storage RLS
------------------------------------------------------------

drop policy if exists "post_images_select"        on storage.objects;
drop policy if exists "post_images_admin_insert"  on storage.objects;
drop policy if exists "post_images_admin_update"  on storage.objects;
drop policy if exists "post_images_admin_delete"  on storage.objects;

create policy "post_images_select"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "post_images_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-images' and public.is_admin(auth.uid()));

create policy "post_images_admin_update"
  on storage.objects for update
  to authenticated
  using      (bucket_id = 'post-images' and public.is_admin(auth.uid()))
  with check (bucket_id = 'post-images' and public.is_admin(auth.uid()));

create policy "post_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-images' and public.is_admin(auth.uid()));
