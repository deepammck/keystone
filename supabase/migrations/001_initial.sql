-- Keystone initial schema
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text default 'America/New_York',
  timer_started_at timestamptz,
  timer_label text,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  text text not null,
  completed boolean default false,
  completed_at timestamptz,
  date date not null default current_date,
  position smallint default 0,
  created_at timestamptz default now()
);

create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  started_at timestamptz not null,
  duration_seconds integer not null,
  label text,
  date date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  position smallint default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null default current_date,
  completed boolean default false,
  unique(habit_id, date)
);

create table if not exists weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  week_start date not null,
  reflection text,
  unique(user_id, week_start)
);

create index if not exists tasks_user_date_idx on tasks(user_id, date);
create index if not exists focus_user_date_idx on focus_sessions(user_id, date);
create index if not exists habit_logs_user_date_idx on habit_logs(user_id, date);

-- ---------------------------------------------------------------------------
-- New-user trigger: create profile + seed 3 default habits
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);

  insert into public.habits (user_id, name, position) values
    (new.id, 'Screentime < 2h', 0),
    (new.id, 'Sleep @ 10:30 PM', 1),
    (new.id, 'Read 1 Chapter', 2);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table tasks enable row level security;
alter table focus_sessions enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table weekly_reflections enable row level security;

-- profiles (own row is keyed by id = auth.uid())
create policy "profiles_select" on profiles for select using (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);

-- tasks
create policy "tasks_select" on tasks for select using (auth.uid() = user_id);
create policy "tasks_insert" on tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update" on tasks for update using (auth.uid() = user_id);
create policy "tasks_delete" on tasks for delete using (auth.uid() = user_id);

-- focus_sessions
create policy "focus_select" on focus_sessions for select using (auth.uid() = user_id);
create policy "focus_insert" on focus_sessions for insert with check (auth.uid() = user_id);
create policy "focus_update" on focus_sessions for update using (auth.uid() = user_id);
create policy "focus_delete" on focus_sessions for delete using (auth.uid() = user_id);

-- habits
create policy "habits_select" on habits for select using (auth.uid() = user_id);
create policy "habits_insert" on habits for insert with check (auth.uid() = user_id);
create policy "habits_update" on habits for update using (auth.uid() = user_id);
create policy "habits_delete" on habits for delete using (auth.uid() = user_id);

-- habit_logs
create policy "habit_logs_select" on habit_logs for select using (auth.uid() = user_id);
create policy "habit_logs_insert" on habit_logs for insert with check (auth.uid() = user_id);
create policy "habit_logs_update" on habit_logs for update using (auth.uid() = user_id);
create policy "habit_logs_delete" on habit_logs for delete using (auth.uid() = user_id);

-- weekly_reflections
create policy "reflections_select" on weekly_reflections for select using (auth.uid() = user_id);
create policy "reflections_insert" on weekly_reflections for insert with check (auth.uid() = user_id);
create policy "reflections_update" on weekly_reflections for update using (auth.uid() = user_id);
create policy "reflections_delete" on weekly_reflections for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table habit_logs;
