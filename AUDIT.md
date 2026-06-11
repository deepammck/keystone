# Full App Audit — Keystone / Links / College

**Date:** 2026-06-09 · **Scope:** every source file (app/, components/, lib/, supabase/migrations/, public/sw.js, manifest, config). Two full passes: (1) file-by-file read of all ~80 files, (2) targeted verification of every suspected issue (greps, migration constraints, build).
**Static checks:** `npm run lint` ✅ · `tsc --noEmit` ✅ · `npm run build` ✅ — all findings below are logic, security, data-integrity, or UX issues, not compile errors.

---

## HIGH — security, data loss, broken features

### H1. SSRF / open unauthenticated fetch proxy — `app/api/fetch-metadata/route.ts`
The endpoint fetches any caller-supplied URL server-side with **no auth check, no private-IP/localhost blocking, and no rate limit**. Anyone (signed out — the proxy matcher passes `/api/*` through without auth) can make the server fetch `http://169.254.169.254/…`, `http://localhost:…`, or internal hosts and receive extracted title/description/first-paragraph text back. Fix: require a session, resolve + reject private/link-local/loopback IPs (and re-check after redirects), and rate-limit.

### H2. `profiles.last_app` is never written; "last app" is never restored — `components/AppSwitcher.tsx:28`
`void supabase.from("profiles").upsert({ id, last_app })` never executes: supabase-js query builders are lazy thenables that only fire when awaited/`.then`'d. (`components/SettingsModal.tsx:82-85` documents this exact trap.) Additionally, **nothing in the codebase ever reads** `keystone:last-app` or `profiles.last_app` — the "reopen the last-used tool" feature is half-built: written (localStorage only) and never used.

### H3. College sub-tabs revert to the stale page-load snapshot — `components/CollegeTool.tsx` + `lib/hooks/useCollection.ts`
Each module mounts `useCollection(table, initial, …)` seeded from the SSR/local snapshot, and `useCollection` **never refetches on mount** (only on realtime `postgres_changes` events). Tab switches unmount/remount modules. Consequences:
- Add/edit rows in Activities → switch to Schools → switch back: your edits **visually disappear** (module re-seeds from the stale `data.activities`). In local mode it's guaranteed (realtime is a no-op stub); in Supabase mode the refetched state lived in the unmounted instance and is discarded.
- The **Overview tab is permanently stale** within a session — its counts/GPA read the original `data` prop, never the live collections.
Fix: refetch on mount in `useCollection`, or lift the nine collections up to `CollegeTool`.

### H4. Notepad silently discards pending saves — `components/Notepad.tsx`
- `goTo()` (lines 56-67) does `clearTimeout(saveTimer)` and **never flushes** the pending debounced write — despite its own comment saying "Flush any pending save". Type, then click ◀ within 800 ms → those keystrokes are gone.
- The unmount cleanup (lines 31-36) also discards a pending save; there's no `beforeunload` flush, so closing the tab inside the debounce window loses the note.
- Also: `goTo` has no request-cancellation — two fast prev/next clicks can race and show the wrong day's content under the new date.
- Honesty nit: "Saved" is shown when the write was merely *queued* offline.

### H5. Offline queue: poison ops retry forever and replay out of order — `lib/offline-queue.ts`
- `runOrQueue` enqueues on **any** error (line 62-66), not just network failures. A 4xx (RLS violation, constraint, bad payload) is parked and retried on every reconnect/mount **forever** — `flushQueue` keeps failures unconditionally. Needs error-class discrimination and/or retry cap.
- Ordering: while older ops sit in the queue, new writes still apply immediately (`runOrQueue` doesn't check queue depth), so a queued `delete` can replay *after* a later successful `insert/update` — resurrecting or clobbering state. New ops should append behind a non-empty queue.
- Concurrency: `flushQueue` runs from `useOnline` in every open tab with no lock; `focus_sessions` inserts carry **no client id** (`lib/hooks/useTimer.ts:80-90`), so a double flush duplicates sessions (tasks/events/links/college inserts are PK-protected; this one isn't).

### H6. Timer pause doesn't survive reload — `lib/hooks/useTimer.ts:43-47`
`pause()` only sets local state; `profiles.timer_started_at` keeps the old running start. Reload while paused → hook re-initializes to `"running"` with the original start, so all paused time is silently counted as focus. Persist a paused marker (or null the start and store frozen elapsed). Related: `profiles.timer_label` is never written anywhere (only nulled) — dead column.

### H7. Rollover can permanently strand yesterday's tasks — `lib/hooks/useRollover.ts`
The carry-forward UPDATE isn't routed through `runOrQueue` and its result is ignored: if the first load of a new day happens offline (the PWA's headline use case), `keystone:last-date` is still set and `onRolled()` fires — the rollover is marked done without ever applying, and incomplete tasks stay stuck on a past date invisible to the Today view. Also:
- `onRolled` = `window.location.reload()` runs **unconditionally on the first load of every day**, even when zero tasks rolled — a guaranteed double page load every morning.
- `keystone:last-date` isn't namespaced per user — two accounts in one browser suppress each other's rollover.

### H8. College tool has no offline plumbing — `components/CollegeTool.tsx`
`useOnline` (which both flushes the queue on mount/reconnect and drives `OfflineIndicator`) is mounted only in `Dashboard` and `LinksTool`. On `/college`: no offline banner, and queued writes are never flushed while you stay on that page.

---

## MEDIUM — correctness & UX

### M1. SettingsModal save/discard semantics are inverted and lossy — `components/SettingsModal.tsx`
- Clicking the **backdrop discards every edit silently** (`onClose`), while the **X button is secretly the only Save** (`onClick={save}`, aria-label "Close settings"). No Save button, no Escape handler, no `role="dialog"`/`aria-modal`/focus trap.
- `save()` uses raw supabase calls (not `runOrQueue`): offline, all habit/timezone/goal changes fail silently and `window.location.reload()` wipes the form. No error handling at all.
- Clearing a time input → `hhmmToMinutes("")` = `NaN` → attempts to write `wake_minute: NaN`.
- Deleting a habit cascades away its entire `habit_logs` history (streaks/heatmap) with no warning.
- Cosmetic: timezone labels ("EST", "CST"…) ignore DST.

### M2. Header renders epoch-1970 time for the first frame — `components/Header.tsx:51-84` vs `lib/hooks/useNow.ts`
`useNow` returns `0` until its effect fires, but Header guards with `now != null` — always true. First paint shows `· 19:00` (epoch in ET) and a wrong "% of day left"/"Time to sleep" chip. `EventList` uses the correct sentinel (`now === 0 ? "·"`); Header (and its `sleeping`/`pctLeft`) should too.

### M3. Timezone split-brain between profile tz and device tz
- Deadlines: `DateTimePicker` highlights "today" via profile tz (`todayInTz(timezone)`) but the picked value is interpreted in **device-local** time (`new Date(dueAtIso)` in `useEvents.addEvent`, `toPickerValue` in `EventList.tsx:22-24`).
- `TestingModule.daysUntil` (lines 25-30) computes midnight in device tz.
- `Notepad`/`WeekHistory`/`Heatmap` day labels (`formatDayLabel`/`parseISO`) format in device tz.
When profile tz ≠ device tz, dates/countdowns shift. Pick one tz for all entry/display (the app's stated rule is profile tz via `lib/utils.ts`).

### M4. `useTasks.refetch` downloads the user's entire task history — `lib/hooks/useTasks.ts:34-44`
No date filter (`select * where user_id`), then filters client-side. Since rollover keeps completed tasks on past dates as the archive, this payload grows forever and re-downloads on **every** tasks realtime event. Filter server-side (`date = today OR date IS NULL`).

### M5. An open dashboard never crosses midnight — `components/Dashboard.tsx`
`today` is frozen at page load; `useRollover` only runs on mount. A tab left open past midnight keeps writing tasks/habits/notes to yesterday until manual reload. Needs a "date changed" tick (e.g., from `useNow`) that triggers the rollover/reload.

### M6. Swipe-to-delete is unreliable on touch — `components/TaskItem.tsx:38-51`
Pointer handlers without `touch-action: pan-y` or `setPointerCapture`: the browser claims horizontal-ish moves for scrolling and fires `pointercancel`, so the swipe rarely completes; there's also no transition reset when the swipe is abandoned mid-gesture.

### M7. Completed inbox tasks live in limbo — `lib/hooks/useTasks.ts` / `TaskList`
Inbox rows render a completion checkbox; checking one strikes it through but it stays in the Inbox forever (date NULL, completed true) — it never appears in history (WeekHistory queries by `date`) and never gets archived. Also `moveToToday` keeps `completed: true` when pulling a checked item to Today. Either hide the toggle in Inbox or define semantics.

### M8. Essay drafts can lose work — `components/college/EssaysModule.tsx:618-735`
Draft body lives in local `useState`, saved only `onBlur`. Closing the tab (or anything that unmounts without blur) silently drops edits. "Save as new version" reads `latest.body` from a render-time closure and works only because React happens to flush the blur update before `click` — fragile coupling worth making explicit (use the textarea state). Also "Delete" removes only the **latest version**, quietly resurfacing the previous version rather than deleting the draft group.

### M9. Honors reorder mutates `created_at` with racing writes — `components/college/HonorsModule.tsx:78-84`
Two parallel `update` calls swap `created_at`; a realtime refetch can land between them and re-sort mid-swap, and the column loses its "when was this added" meaning. A `position` column (already the pattern in `habits`/`tasks`) is the right tool.

### M10. Service-worker cache issues — `public/sw.js`
- Stale-while-revalidate caches **every** same-origin GET, including `/api/fetch-metadata` responses.
- `CACHE` version is hard-coded `keystone-v1` with no size cap — grows unboundedly.
- Cached authenticated page navigations remain servable after sign-out on a shared device.

### M11. Auth-failure feedback is dropped — `app/auth/callback/route.ts:25`
Failed magic-link exchange redirects to `/?error=auth`, but `app/page.tsx` never reads `error` — the user lands on the sign-in form with zero explanation.

### M12. `maximumScale: 1` disables pinch zoom — `app/layout.tsx:36-42`
WCAG 1.4.4 violation on iOS Safari. Remove `maximumScale` (and consider dropping `userScalable` constraints entirely).

### M13. Testing module has no edit path — `components/college/TestingModule.tsx`
A planned sitting can't be marked taken or given a score — you must delete and re-add (losing date/goal). Academics has "Mark as completed"; Testing needs the equivalent.

### M14. GoalBanner add-form blurs into accidental submits — `components/GoalBanner.tsx:52-62`
`onBlur={submit}` means any click-away creates the goal; Escape isn't handled, so the only way out of add-mode without creating something is to empty the field first.

### M15. Theme only reconciles on the dashboard — `components/Dashboard.tsx:58-63`
The profile-theme → DOM/localStorage sync effect exists only in `Dashboard`. Visiting `/links` or `/college` directly after localStorage eviction renders the default dark theme even when the profile says mocha.

---

## LOW — polish, perf, hygiene

- **L1. Stale docs:** `lib/types.ts:20-22` and `supabase/migrations/009_goals.sql` both describe Goals as "a collapsible sub-area inside the Deadlines section" — it's actually the header `GoalBanner`; `Goal.completed` is retained-but-unused.
- **L2. Memo defeats:** `WeekHistory` is `memo()`d but receives a fresh `todayCompletedTasks` array and an inline `onTodaySessionDeleted` closure every Dashboard render (`Dashboard.tsx:231-235`) — the memo never hits.
- **L3. `relativeTime` runs `Date.now()` during render** (`components/links/LinkItem.tsx:15-27`) — violates the project's render-purity rule and the labels ("5m ago") never refresh while mounted.
- **L4. Streak caps:** HabitList streak is computed over a 7-day window (max display 7), Heatmap streak over the 42-day window (max 42) — long real streaks silently truncate.
- **L5. Heatmap/per-row fetch staleness:** deleting an old focus session in WeekHistory doesn't update the already-fetched Heatmap stats until the window changes or reload.
- **L6. `agentation` is a devDependency imported unconditionally in `app/layout.tsx`** — any build environment that prunes devDeps before `next build` fails to resolve it.
- **L7. Favicon privacy leak:** every saved link's hostname is sent to `google.com/s2/favicons` (`LinkItem.tsx:73-79`).
- **L8. Add-link latency:** `useLinks.addLink` awaits the metadata fetch (up to 6 s) **before** the optimistic insert — the "Saving…" button blocks on the network; insert first, patch metadata after.
- **L9. `position` collisions:** `addTask` uses `tasks.length` (includes completed) and `moveToToday` uses `prev.length`; after deletions, duplicates rely on `created_at` (client clock) tie-breaks. Clock skew across devices can also disorder `useCollection` rows since `created_at` is set client-side.
- **L10. WeekHistory `goToWeek` has no error handling** — offline, it renders an all-zero week as if it were real data (`loading` overlay clears, nulls coerce to empty).
- **L11. Old deadlines accumulate forever** as red "Overdue" rows; no archive/auto-clear.
- **L12. `CelebrationToast` isn't announced** (no `aria-live`); Heatmap cells expose data only via `title` (not keyboard/SR accessible).
- **L13. Manifest/viewport mismatch:** `manifest.json` `theme_color #2D2A26` vs layout `themeColor #0a0a0a`; neither follows the selected theme.
- **L14. Local-mode parity nits:** `loadLocalInitial`'s `doneHabitIds`/`focusRows`/`completedTaskDates` don't filter `user_id` (others do); local `.single()` returns `data: null` instead of Supabase's 0-row **error**, a behavioral divergence if `.single()` is ever used client-side.
- **L15. `useHabits` echo-suppression window (2 s)** drops genuinely-external changes that land inside it (accepted trade-off, but undocumented at the call site).
- **L16. `tasks.date default current_date`** (001) is server/UTC "today", not profile-tz today — only safe because every insert passes `date` explicitly.
- **L17. Uncommitted work in tree:** `lib/hooks/useTimer.ts` has an unstaged midnight-attribution fix; `agentation-findings.md` (an older design-review doc) and `import-links.sql` (contains your personal email + 19 link notes) are untracked — decide whether to commit, gitignore, or remove (the SQL file in particular if the repo ever goes public).

---

## What was checked and found sound
- RLS: all 17 tables enable RLS with own-row policies for select/insert/update/delete; `habit_logs` has the `unique(habit_id,date)` needed by the upsert's `onConflict`; FKs cascade coherently.
- Auth: `/dashboard`, `/links`, `/college` all verify the user server-side (middleware only guards `/dashboard`, but pages redirect); the callback's `next` param can't escape the origin.
- Task ordering invariant (completion doesn't reorder), the 5-task cap and its re-check in `moveToToday`, sort-parity between hooks and `local-client` loaders, theme flash-prevention script, reduced-motion handling in `globals.css`, and the local-client upsert PK-default fix all hold.
