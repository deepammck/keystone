# Keystone

## 0) Umbrella (App Switcher)
- This repo hosts an approved umbrella shell: a top-of-page **switcher** (`components/AppSwitcher.tsx`) between three tools — **Keystone** (`/dashboard`), **Links** (`/links`), **College** (`/college`). The switcher + the `/links` and `/college` routes are a deliberate layer ABOVE Keystone, NOT a seventh Keystone section.
- The "one page / six sections / no nav beyond auth" rules in §1 govern the **Keystone route (`/dashboard`)** specifically — they do not forbid the switcher or the sibling tool routes. Each sibling tool may have its own page and its own internal sub-tabs.
- Last-opened tool is persisted like the theme: `localStorage["keystone:last-app"]` + `profiles.last_app`.
- College tool is an *accumulation* tool with its OWN internal sub-tabs (Overview/Activities/Schools/Essays/Academics/Testing/Honors/Recommenders) under `/college` — those sub-tabs are NOT top-level nav and NOT new Keystone sections.

## 1) Hard Rules
- Keystone is one page, six sections (tasks, focus timer, habits, deadlines, daily notepad, past-weeks history) — do not add pages, routes, or nav *within Keystone* beyond the umbrella switcher in §0.
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
- DB schema + RLS: `supabase/migrations/001_initial.sql`, `002_daily_notes.sql` (daily_notes replaces weekly_reflections), `003_inbox_and_events.sql` (nullable `tasks.date` for inbox + `events` table for deadlines), `004_waking_hours.sql` (`profiles.wake_minute`/`sleep_minute`), `005_focus_goal.sql` (`profiles.focus_goal_minutes`), `006_profile_theme.sql` (`profiles.theme`), `007_links.sql` (`links` table for the Link Dump tool + `profiles.last_app`), `008_college.sql` (9 College Tracker tables)
- Auth/SSR clients: `lib/supabase/`
- Shared types: `lib/types.ts`
- Links tool: `links` table + `useLinks` hook + `components/LinksTool.tsx` (+ `components/links/*`); server metadata fetcher at `app/api/fetch-metadata/route.ts` (uses `node-html-parser`). Route `app/links/page.tsx` (SSR in Supabase mode, `components/LocalLinks.tsx` in local mode). Mirrors `useEvents`/`runOrQueue`/local-client conventions.
- College tool: 9 tables (`college_activities`, `college_schools`, `essay_prompts`, `essay_stories`, `essay_drafts`, `college_courses`, `college_tests`, `college_honors`, `college_recommenders`); generic `useCollection` hook (`lib/hooks/useCollection.ts`); reference data + GPA/word-count/limits in `lib/college-reference.ts`; `components/CollegeTool.tsx` + `components/college/*`. Route `app/college/page.tsx` (SSR `Promise.all` in Supabase mode, `components/LocalCollege.tsx` in local mode). Common App prompts/categories are code constants (verify per cycle), not DB rows; story↔prompt links are `text[]`; draft version history via shared `group_id`.
- Deadlines: `events` table + `useEvents` hook + `EventList`; countdowns via `formatCountdown` (`lib/utils.ts`) ticked by `useNow` (`lib/hooks/useNow.ts`).
- Heatmap: `components/Heatmap.tsx` — compact 6-week combined-activity grid (tasks + focus + habits). Reuses `WeekHistory`'s client-side fetch pattern and `lib/utils.ts` date helpers (`addWeeks`, `weekDatesFromStart`, `formatWeekRange`); no schema changes, works in both local and Supabase mode.

## 3) Setup / Test
- `npm install`
- Local mode (default): leave Supabase env unset/placeholder — no auth, data in `localStorage` (`lib/local-mode.ts`, `lib/local-client.ts`).
- Supabase mode: set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, then apply migrations `001` → `008` in order.

## 4) Workflow
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint (must pass clean before done)

## 5) Stop Conditions
- Refuse changes that add pages, navigation, a seventh section *to Keystone* (`/dashboard`), or cut features listed as intentionally excluded (stats, session logs, calendar, etc.). NOTE: a compact activity heatmap widget IS intentionally included (see Hard Rules §1) — do not treat heatmaps as excluded. The umbrella switcher + sibling tool routes (§0) are exempt — they live outside Keystone.
- Ask before changing the data model, RLS policies, or the migration file.
- Ask before adding any dependency.
- Stop and report if a feature needs live Supabase to verify and credentials are absent.
