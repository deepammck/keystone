-- Subscribable calendar feed for Deadlines. Calendar apps (Google/Apple) fetch
-- webcal:// / https:// feeds with NO cookies, so /api/calendar?token=… is
-- authenticated by an unguessable per-user token instead of a session.

alter table profiles
  add column if not exists ics_token uuid not null default gen_random_uuid();

-- The feed route resolves token -> events; keep that lookup indexed (and the
-- token unique, so a token can never resolve to two users).
create unique index if not exists profiles_ics_token_idx on profiles (ics_token);

-- SECURITY DEFINER resolver: returns the matching user's events for a token,
-- without a session. RLS stays enabled on every table — this function is the
-- single, deliberate anonymous read path, gated on knowing the 122-bit token.
-- search_path is pinned so the definer privilege can't be hijacked.
create or replace function public.events_for_ics_token(token uuid)
returns setof events
language sql
stable
security definer
set search_path = public
as $$
  select e.*
  from events e
  join profiles p on p.id = e.user_id
  where p.ics_token = token
  order by e.due_at asc;
$$;

revoke all on function public.events_for_ics_token(uuid) from public;
grant execute on function public.events_for_ics_token(uuid) to anon, authenticated;
