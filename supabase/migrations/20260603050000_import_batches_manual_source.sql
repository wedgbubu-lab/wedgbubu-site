-- 어드민 콘솔에서 단건 구독 추가도 commit_import RPC를 거치도록 source='manual' 허용.

alter table public.import_batches
  drop constraint if exists import_batches_source_check;

alter table public.import_batches
  add constraint import_batches_source_check
  check (source in ('xlsx', 'google_sheet', 'manual'));
