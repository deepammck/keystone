# Keystone

## 1) Hard Rules
- One page, six sections (tasks, focus timer, habits, deadlines, daily notepad, past-weeks history) — do not add pages, routes, or nav beyond auth.
- A compact activity heatmap widget sits at the bottom of the left column (below the Tasks/Inbox area) as part of progress display, with a small streak / this-week stats panel beside the grid. It is a widget, NOT a seventh section — do not expand it into one or give it its own page/nav.
- The Tasks section contains two sub-areas: the Today list and a collapsible "Inbox". Keep them inside the one Tasks `<section>` — don't promote them to top-level sections.
- Max 5 active *today* tasks; the 6th shows "Finish something first." Inbox is unlimited backlog (`tasks.date = NULL`) and does NOT count toward the limit; `moveToToday` re-checks the limit.
- Completed today tasks stay inline in their slot, struck through — completion must NOT reorder the list (sorting completed tasks to the bottom caused the "clicking jumps to the lowest task" bug). Order is by `position`/`created_at` only.
- No new dependencies without explicit approval.
- No state-management libraries (Redux/Zustand) — `useState` + Supabase realtime only.
- All day/week math goes through `lib/utils.ts` (timezone-aware); never use raw `Date` for "today".
- Every Supabase table is RLS-gated on `auth.uid() = user_id`; never disable RLS.
- Mutations go through `runOrQueue` (`lib/offline-queue.ts`) for optimistic + offline behavior.
- `Date.now()` must not run during render (React 19 purity); use effects/callbacks.
- Use the `proxy.ts` convention (not `middleware.ts`) — Next 16.

## 2) Authority & Links
- Build plan: `/Users/dmk-admin/.claude/plans/keystone-single-page-splendid-ocean.md`
- DB schema + RLS: `supabase/migrations/001_initial.sql`, `002_daily_notes.sql` (daily_notes replaces weekly_reflections), `003_inbox_and_events.sql` (nullable `tasks.date` for inbox + `events` table for deadlines)
- Auth/SSR clients: `lib/supabase/`
- Shared types: `lib/types.ts`
- Deadlines: `events` table + `useEvents` hook + `EventList`; countdowns via `formatCountdown` (`lib/utils.ts`) ticked by `useNow` (`lib/hooks/useNow.ts`).
- Heatmap: `components/Heatmap.tsx` — compact 6-week combined-activity grid (tasks + focus + habits). Reuses `WeekHistory`'s client-side fetch pattern and `lib/utils.ts` date helpers (`addWeeks`, `weekDatesFromStart`, `formatWeekRange`); no schema changes, works in both local and Supabase mode.

## 3) Setup / Test
- `npm install`
- Local mode (default): leave Supabase env unset/placeholder — no auth, data in `localStorage` (`lib/local-mode.ts`, `lib/local-client.ts`).
- Supabase mode: set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, then apply migrations `001` → `002` → `003` in order.

## 4) Workflow
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint (must pass clean before done)

## 5) Stop Conditions
- Refuse changes that add pages, navigation, a seventh section, or cut features listed as intentionally excluded (stats, session logs, calendar, etc.). NOTE: a compact activity heatmap widget IS intentionally included (see Hard Rules §1) — do not treat heatmaps as excluded.
- Ask before changing the data model, RLS policies, or the migration file.
- Ask before adding any dependency.
- Stop and report if a feature needs live Supabase to verify and credentials are absent.
