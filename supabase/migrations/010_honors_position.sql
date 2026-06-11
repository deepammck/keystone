-- Keystone migration 010: explicit ordering for honors.
--
-- The Honors module lets the user reorder awards within a prestige level. That
-- reorder previously swapped each row's `created_at` (two racing updates that a
-- realtime refetch could interleave, and which destroyed the "when was this
-- added" meaning). A dedicated `position` column — the same pattern already used
-- by `tasks` and `habits` — makes ordering first-class and the swap atomic per
-- row. RLS is unchanged (inherited from 008's policies on college_honors).

alter table college_honors
  add column if not exists position int not null default 0;

-- Backfill existing rows so their current created_at order is preserved as the
-- initial position (oldest = 0), per user.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by created_at
    ) - 1 as rn
  from college_honors
)
update college_honors h
set position = ranked.rn
from ranked
where ranked.id = h.id;
