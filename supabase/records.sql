-- Tabela generică din src/lib/store.ts: o colecție e un filtru pe `collection`.
create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  collection text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists records_collection_created on records (collection, created_at);
alter table records enable row level security;
-- Demo fără login: oricine are aplicația citește și scrie. Nu punem date personale aici.
create policy "demo_all" on records for all to anon using (true) with check (true);
