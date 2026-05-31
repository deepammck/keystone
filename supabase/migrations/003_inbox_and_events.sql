-- Keystone migration 003: inbox (unscheduled tasks) + events (deadlines)

-- ---------------------------------------------------------------------------
-- Inbox: a task with date = NULL is an unscheduled backlog item. The today
-- view filters on date = current_date; the inbox view filters on date IS NULL.
-- ---------------------------------------------------------------------------

alter table tasks alter column date drop not null;

-- ---------------------------------------------------------------------------
-- Events: standalone deadlines (distinct from tasks). Shown with a countdown.
-- ---------------------------------------------------------------------------

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  due_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists events_user_due_idx on events(user_id, due_at);

alter table events enable row level security;

create policy "events_select" on events for select using (auth.uid() = user_id);
create policy "events_insert" on events for insert with check (auth.uid() = user_id);
create policy "events_update" on events for update using (auth.uid() = user_id);
create policy "events_delete" on events for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table events;
