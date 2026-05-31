-- Daily focus goal (minutes). When today's logged focus reaches this, the
-- dashboard fires a reward. Default 60 (1h).

alter table profiles
  add column if not exists focus_goal_minutes smallint not null default 60;
