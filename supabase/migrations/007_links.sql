-- Link Dump: save a URL plus the reason you saved it. Per-user, RLS-gated like
-- every other table (the standalone link-dump app used anon-full-access + no
-- user_id; here it follows Keystone's auth.uid() = user_id convention instead).
--
-- Also adds profiles.last_app so the top app-switcher remembers which tool was
-- open last and can follow the account across devices (same idea as theme).

create table if not exists links (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  url         text not null,
  note        text not null,
  title       text,
  summary     text,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- Speeds up the per-user, newest-first list as it grows.
create index if not exists links_user_created_idx on links (user_id, created_at desc);

alter table links enable row level security;

create policy "links_select" on links for select using (auth.uid() = user_id);
create policy "links_insert" on links for insert with check (auth.uid() = user_id);
create policy "links_update" on links for update using (auth.uid() = user_id);
create policy "links_delete" on links for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table links;

-- Which tool the app-switcher last had open ('keystone' | 'links' | 'college').
alter table profiles
  add column if not exists last_app text not null default 'keystone';
