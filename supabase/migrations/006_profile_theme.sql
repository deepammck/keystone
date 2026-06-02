-- Color theme, persisted per-user so it follows the account across devices and
-- survives localStorage eviction (the previous store). localStorage is still
-- used as an instant-paint cache; this column is the source of truth.

alter table profiles
  add column if not exists theme text not null default 'dark';
