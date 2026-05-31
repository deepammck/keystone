-- Keystone migration 002: per-day notepad
-- Replaces weekly_reflections with a per-day daily_notes table.
-- Run this in the Supabase SQL editor (or via the CLI) after 001_initial.sql.

create table if not exists daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null default current_date,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

create index if not exists daily_notes_user_date_idx on daily_notes(user_id, date);

alter table daily_notes enable row level security;

create policy "daily_notes_select" on daily_notes for select using (auth.uid() = user_id);
create policy "daily_notes_insert" on daily_notes for insert with check (auth.uid() = user_id);
create policy "daily_notes_update" on daily_notes for update using (auth.uid() = user_id);
create policy "daily_notes_delete" on daily_notes for delete using (auth.uid() = user_id);

-- Weekly reflections are superseded by per-day notes.
drop table if exists weekly_reflections cascade;
