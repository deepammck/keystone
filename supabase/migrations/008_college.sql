-- Keystone migration 008: College App Tracker.
--
-- A junior-year *accumulation* tool (not a submission tool). One table per
-- module, every table RLS-gated on auth.uid() = user_id, following the same
-- pattern as 003's events table (user_id -> profiles(id), four policies, added
-- to the realtime publication). Many-to-many relationships use text[] array
-- columns because the local-mode client (lib/local-client.ts) can't do joins.
--
-- The official 7 Common App personal-statement prompts and the fixed activity
-- category list live in code (lib/college-reference.ts), not here — only
-- user-added prompts/data are persisted.

-- ---------------------------------------------------------------------------
-- Activities — the living log. He dumps everything in now and curates the
-- Common App top-10 shortlist later (ca_candidate + ca_rank).
-- ---------------------------------------------------------------------------
create table if not exists college_activities (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references profiles(id) on delete cascade not null,
  name                text not null,
  category            text,
  role                text,
  organization        text,
  description         text,          -- free-text brain dump
  ca_description      text,          -- the tightened 150-char Common App version
  grades              int[] not null default '{}',  -- 9,10,11,12,13(=post-grad)
  timing              text,          -- school year / break / year-round
  hours_per_week      int,
  weeks_per_year      int,
  status              text not null default 'active',  -- active | ended
  continue_in_college boolean not null default false,
  ca_candidate        boolean not null default false,
  ca_rank             int,
  notes               text,
  position            int not null default 0,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Schools — research collection now, becomes an application checklist later.
-- ---------------------------------------------------------------------------
create table if not exists college_schools (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references profiles(id) on delete cascade not null,
  name              text not null,
  location          text,
  tag               text,            -- reach | target | safety
  status            text not null default 'interested',
  platform          text,            -- Common App | Coalition | direct
  deadline_type     text,            -- EA | ED | REA | RD | rolling
  deadline_date     date,
  app_fee           numeric,
  fee_waiver        boolean not null default false,
  test_policy       text,            -- required | optional | blind
  supplements_count int not null default 0,
  acceptance_rate   text,
  fit_notes         text,
  notes             text,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Essay prompts — user-added supplemental / practice prompts only (the 7
-- personal-statement prompts are rendered from a reference constant).
-- ---------------------------------------------------------------------------
create table if not exists essay_prompts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  scope       text not null default 'supplemental',  -- supplemental | practice
  school_id   uuid references college_schools(id) on delete set null,
  text        text not null,
  word_limit  int,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Essay stories — the material bank (the differentiator). prompt_ids links a
-- story to one or more prompts it could answer (reference-prompt id or an
-- essay_prompts row id), stored as a text[] to avoid a join table.
-- ---------------------------------------------------------------------------
create table if not exists essay_stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  title       text not null,
  body        text,
  tags        text[] not null default '{}',
  prompt_ids  text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Essay drafts — multiple drafts of the same essay share a group_id (version
-- history without overwriting). prompt_ref = reference-prompt id or prompt row.
-- ---------------------------------------------------------------------------
create table if not exists essay_drafts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  prompt_ref  text,
  school_id   uuid references college_schools(id) on delete set null,
  title       text,
  body        text,
  status      text not null default 'brainstorm',  -- brainstorm|outlining|drafting|revising|done
  group_id    uuid not null default gen_random_uuid(),
  version     int not null default 1,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Academics — courses by year/term; the senior-year planner is just rows with
-- planned = true. GPA (weighted/unweighted) is computed client-side.
-- ---------------------------------------------------------------------------
create table if not exists college_courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  grade_level text,                  -- 9 | 10 | 11 | 12
  term        text,
  name        text not null,
  rigor       text not null default 'Regular',  -- AP|IB|Honors|Dual Enrollment|Regular
  grade       text,                  -- letter grade (keys into GPA_SCALE)
  planned     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Testing — "planned" is a first-class status (junior = the testing window).
-- subscores/goal stored as jsonb; superscore computed client-side.
-- ---------------------------------------------------------------------------
create table if not exists college_tests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  kind        text not null,         -- SAT | ACT | AP | Other
  label       text,                  -- e.g. AP subject
  test_date   date,
  status      text not null default 'planned',  -- planned | taken
  score       int,                   -- actual composite/total
  goal        int,                   -- goal composite/total
  subscores   jsonb not null default '{}'::jsonb,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Honors & awards — Common App caps at 5; UI notes it but lets him log more.
-- ---------------------------------------------------------------------------
create table if not exists college_honors (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  title       text not null,
  level       text,                  -- school | state | national | international
  grade       text,                  -- grade level received
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Recommenders — light for now; mostly a notes space.
-- ---------------------------------------------------------------------------
create table if not exists college_recommenders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  name        text not null,
  subject     text,
  why_fit     text,
  status      text not null default 'considering',  -- considering|asked|agreed|submitted
  notes       text,
  created_at  timestamptz not null default now()
);

-- Per-user, recent-first indexes.
create index if not exists college_activities_user_idx   on college_activities (user_id, created_at);
create index if not exists college_schools_user_idx       on college_schools (user_id, created_at);
create index if not exists essay_prompts_user_idx         on essay_prompts (user_id, created_at);
create index if not exists essay_stories_user_idx         on essay_stories (user_id, created_at);
create index if not exists essay_drafts_user_idx          on essay_drafts (user_id, created_at);
create index if not exists college_courses_user_idx       on college_courses (user_id, created_at);
create index if not exists college_tests_user_idx         on college_tests (user_id, created_at);
create index if not exists college_honors_user_idx        on college_honors (user_id, created_at);
create index if not exists college_recommenders_user_idx  on college_recommenders (user_id, created_at);

-- RLS: own-rows only, four policies per table (mirrors 003's events table).
do $$
declare t text;
begin
  foreach t in array array[
    'college_activities','college_schools','essay_prompts','essay_stories',
    'essay_drafts','college_courses','college_tests','college_honors',
    'college_recommenders'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (auth.uid() = user_id)', t||'_select', t);
    execute format('create policy %I on %I for insert with check (auth.uid() = user_id)', t||'_insert', t);
    execute format('create policy %I on %I for update using (auth.uid() = user_id)', t||'_update', t);
    execute format('create policy %I on %I for delete using (auth.uid() = user_id)', t||'_delete', t);
    execute format('alter publication supabase_realtime add table %I', t);
  end loop;
end $$;
