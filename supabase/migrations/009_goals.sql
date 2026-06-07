-- Goals: a lightweight checklist of "things I want to achieve". Per-user,
-- RLS-gated like every other table. It is NOT a new Keystone section — it
-- renders as a collapsible sub-area inside the Deadlines (EventList) section,
-- the same way Tasks nests its Inbox. Shape mirrors `links`/`events`: a simple
-- row reused through the generic useCollection hook.

create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  title       text not null,
  completed   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Speeds up the per-user, oldest-first list (useCollection sorts created_at asc).
create index if not exists goals_user_created_idx on goals (user_id, created_at);

alter table goals enable row level security;

create policy "goals_select" on goals for select using (auth.uid() = user_id);
create policy "goals_insert" on goals for insert with check (auth.uid() = user_id);
create policy "goals_update" on goals for update using (auth.uid() = user_id);
create policy "goals_delete" on goals for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table goals;
