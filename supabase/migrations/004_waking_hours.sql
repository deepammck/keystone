-- Configurable waking-hours window for the header "% of day left" display.
-- Stored as minutes since local midnight. Defaults: 07:00 wake, 23:00 sleep.

alter table profiles
  add column if not exists wake_minute  smallint not null default 420,
  add column if not exists sleep_minute smallint not null default 1380;
