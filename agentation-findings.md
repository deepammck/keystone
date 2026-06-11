# Agentation Design Review — Findings & Fix Instructions

**Generated:** 2026-06-04 via an autonomous Agentation self-driving critique pass.
**Surfaces reviewed (11):** landing `/`, Keystone `/dashboard`, Links `/links`, and all 8 College sub-tabs under `/college` (Overview, Activities, Schools, Essays, Academics, Testing, Honors, Recommenders).
**Total observations:** 61 (landing 4, dashboard 8, links 7, college 42).

## How to use this document
- These are **design / UX observations only**. No application code was changed during this round — fixes are for you (the implementing agent) to make.
- Sample data was seeded into `localStorage` (`keystone:local-db`) so populated layouts could be reviewed. One seed value was non-canonical and has a verification note below (Overview → Upcoming tests).
- Each finding lists **What** (the issue), **Where** (UI location + likely component), **Fix** (concrete, actionable), and **Principle**.
- **Respect `CLAUDE.md`.** Do not add pages, routes, or a 7th section to Keystone, add dependencies, or change the data model / RLS / migrations without approval. Several fixes below are styling/markup-only; where a fix could imply scope creep it is flagged. Keep all day/week math in `lib/utils.ts`, mutations through `runOrQueue`, and no `Date.now()` during render.
- Component map: landing → `app/page.tsx` + `components/SignInForm.tsx`; dashboard → `components/Dashboard.tsx` / `components/LocalDashboard.tsx` (+ section sub-components, `components/Heatmap.tsx`); links → `components/LinksTool.tsx`, `components/links/*`; college → `components/CollegeTool.tsx`, `components/college/*` (shared primitives in `components/college/ui.tsx`).

---

## Landing — `/` (`app/page.tsx`, `components/SignInForm.tsx`)

1. **Hero wordmark floats in dead-center.** *Where:* the tinted card containing the `Keystone` `<h1>`. *Fix:* give the card more presence (≈`max-w-md`, generous internal padding), add a one-line value prop under the tagline, and anchor the composition higher (`justify-start` with top padding) instead of vertical dead-center. *Principle:* visual hierarchy / landing-page conventions (Linear, Vercel).

2. **Tagline is under-emphasized.** *Where:* muted 14px `<p>` "Tasks, focus, habits. One page." *Fix:* promote to 16–18px, higher contrast; consider rendering the triad as three small inline pills to telegraph the product's structure. *Principle:* emphasis on the core hook.

3. **Primary CTA lacks affordance + feedback.** *Where:* the "Open Keystone" link/button. *Fix:* add a forward arrow ("Open Keystone →") and a clear hover/press state (subtle lift + background shift). *Principle:* conversion design / interactive affordance.

4. **Local-mode notice buried.** *Where:* the 12px muted "Local mode — data is saved to this browser" line. *Fix:* pair with a device/database icon in a subtly tinted info-row so users grasp data persistence before investing. *Principle:* expectation-setting / trust.

---

## Keystone Dashboard — `/dashboard` (`components/Dashboard.tsx`, `components/LocalDashboard.tsx`)

1. **Live date-time header outweighs its value.** *Where:* the large serif `<h1>` "Thursday, June 4 · 20:24". *Fix:* demote to a muted 14–16px overline, or replace with a greeting, so the eye lands on actionable content first. *Principle:* hierarchy — biggest element should carry the most value.

2. **Focus timer lacks ceremony.** *Where:* "Ready to focus?" section (focus-timer). *Fix:* make Start a large primary pill, show focus-goal progress (e.g. 0 of 60 min) as a ring/bar, and center the composition. *Principle:* emphasis on the hero action.

3. **Today vs Inbox separation + 5-task cap invisible.** *Where:* Tasks `<section>` (Today list + collapsible Inbox). *Fix:* add a small counter (e.g. "3 of 5 today") near the heading and a clearer divider before Inbox; mute completed (struck-through) items more. *Note:* keep both sub-areas inside the one Tasks section (per CLAUDE.md). *Principle:* progressive disclosure / constraint visibility.

4. **Heatmap is dense and weakly labeled.** *Where:* "Progress" section (`components/Heatmap.tsx`). *Fix:* increase cell gap, lighten gridlines, add a small intensity legend, and add a streak / this-week summary stat beside the grid. *Note:* it's a widget, not a new section. *Principle:* data legibility (GitHub contribution graph).

5. **Habit toggle affordance is small/low-contrast.** *Where:* Habits section rows. *Fix:* make the daily check a clear tappable circle (≥44px), use color/fill for done vs pending; consider a faint per-habit weekly dot-strip. *Principle:* touch-target sizing / feedback (Streaks).

6. **Deadline countdowns don't signal urgency.** *Where:* Deadlines section (`4d 23h` countdowns via `formatCountdown`). *Fix:* color-code by urgency (red <7d, amber <30d), right-align countdowns in tabular/monospace figures; make "+ Add" a quieter ghost button. *Principle:* urgency encoding / scannable columns.

7. **Daily notepad gives no save cue.** *Where:* daily-notepad section. *Fix:* add a subtle "saved" indicator and an empty-state placeholder prompt; give the serif body more line-height and a max width. *Principle:* system status visibility / readability.

8. **Past-weeks history reads as a footer.** *Where:* collapsed "Past weeks" disclosure at the very bottom. *Fix:* clearer disclosure affordance (chevron + label like "View past weeks") and more vertical padding. *Principle:* discoverability.

---

## Links / Link Dump — `/links` (`components/LinksTool.tsx`, `components/links/*`)

1. **No orientation for the tool's premise.** *Where:* "Link Dump" `<h1>`. *Fix:* add a one-line subtitle ("Save links with a note on why they matter") so first-timers grasp how it differs from bookmarks. *Principle:* onboarding clarity.

2. **Save form reads like a generic form.** *Where:* AddLink form (URL + note + tags equal weight). *Fix:* tighten into one card with the URL as the prominent first field, note/tags secondary; auto-focus the URL input on load for instant capture. *Principle:* primary-action emphasis / fast capture.

3. **The note field — the differentiator — looks optional.** *Where:* the "Why are you saving this?" textarea. *Fix:* give it more default height, a warmer placeholder, and a subtle label/icon so it reads as the most important field. *Principle:* emphasis on the product's unique value.

4. **Search is easy to miss.** *Where:* the search input between form and list. *Fix:* add a search icon inside the field and only reveal it once there are enough links to need it. *Principle:* signal-to-noise / progressive disclosure.

5. **Link cards have weak hierarchy.** *Where:* `li.card` items in the list. *Fix:* lead with favicon + domain, make the title the clear primary line, mute the summary, move delete to a hover-revealed corner. *Principle:* card hierarchy (Raindrop, Matter).

6. **Tag chips don't look interactive.** *Where:* tag list inside each card. *Fix:* style as pill-shaped, subtly tinted, clearly clickable filters. *Principle:* affordance — make filtering discoverable.

7. **Delete is a risky bare glyph.** *Where:* the ✕ button on each card. *Fix:* enlarge hit area to ≥44px, reveal on hover, add an undo toast instead of immediate hard removal. *Principle:* error prevention / forgiveness.

---

## College Tracker — `/college` (`components/CollegeTool.tsx`, `components/college/*`)

> All 8 sub-tabs share the `/college` route. Findings are grouped by tab.

### Overview (`components/college/Overview.tsx`)

1. **Dashboard isn't directive.** *Where:* under the "log everything now, curate senior year" subtitle. *Fix:* add a one-line progress summary or next-action nudge so it feels directive, not just a scoreboard. *Principle:* actionable dashboards.

2. **Eight sub-tabs are hard to scan.** *Where:* the horizontal sub-tab scroller (`CollegeTool.tsx`). *Fix:* keep the Overview/working-tabs divider, enlarge the active indicator slightly, and add a wrap or overflow menu for narrow screens (the right-edge fade is the only overflow cue today). *Principle:* navigation legibility. *Note:* these remain internal sub-tabs, not new top-level nav.

3. **Stat cards lack hierarchy.** *Where:* the row of stat cards (Activities, Stories, Schools, GPA…). *Fix:* make GPA and Schools larger, add tiny trend/target hints, accent only the metric needing action. *Principle:* visual hierarchy among metrics.

4. **GPA gets no special treatment.** *Where:* the "Weighted GPA 4.50" card. *Fix:* dedicated treatment — larger serif figure, weighted/unweighted toggle, and a scale reference (out of 5.0). *Principle:* emphasis on the most-scrutinized number.

5. **Upcoming-tests empty state is confusing.** *Where:* "Upcoming tests → No tests planned yet" card. ⚠️ *Verification note:* this was observed while seeded tests used a non-canonical `status`; valid values are `planned`/`taken` only (see `lib/college-reference.ts` `TEST_STATUSES`). **Confirm with valid data before treating as a bug.** *Fix (regardless):* make the empty state actionable ("Add a test date") rather than a dead message. *Principle:* actionable empty states.

6. **Timeline milestones have no status.** *Where:* "Junior-year timeline" left-border list. *Fix:* add state markers (checkmarks for passed phases, a highlighted current phase). *Principle:* progress communication.

### Activities (`components/college/ActivitiesModule.tsx`)

1. **Add action is low-prominence.** *Where:* "+ Add activity" button. *Fix:* make it a primary or dashed add-card affordance at the top; keep it sticky as the list grows. *Principle:* primary-action emphasis.

2. **Cards are always-editable spreadsheet rows.** *Where:* each activity card. *Fix:* show a compact summary (name, role, hours) that expands to the full edit form on click. *Principle:* progressive disclosure / scannability.

3. **Inline fields have no persistent labels.** *Where:* the input row inside each card. *Fix:* add small persistent labels (or label-on-top) so role / hours-per-week / weeks-per-year stay legible once filled. *Principle:* label permanence.

4. **Common App description has no live counter.** *Where:* the "Common App version (≤150 chars)" textarea. *Fix:* add a live count ("132 of 150") that turns amber near the cap. *Principle:* constraint feedback — core to the curate promise.

5. **Inline delete invites accidental loss.** *Where:* the ✕ on each card. *Fix:* move to an overflow menu or require confirmation, offer undo. *Principle:* error prevention.

### Schools (`components/college/SchoolsModule.tsx`)

1. **Reach/target/safety tally is under-played.** *Where:* the 1 / 1 / 0 counters. *Fix:* promote to a segmented bar or three labeled tiles, and flag imbalance (e.g. zero safeties). *Principle:* surfacing list health.

2. **School cards are hard to triage.** *Where:* each school card. *Fix:* lead with name + a colored reach/target/safety chip + next deadline; tuck secondary fields behind an expand. Deadlines should dominate. *Principle:* triage hierarchy.

3. **Status dropdown is an unstyled native select.** *Where:* the interested/researching/applying select. *Fix:* replace with a styled segmented control / pill picker, color-coded by stage. *Principle:* visual consistency / pipeline visibility.

4. **Add action is quiet.** *Where:* "+ Add school". *Fix:* prominent primary or dashed add-card tile at the end of the grid, consistent across modules. *Principle:* action consistency.

5. **Delete removes a hard-to-rebuild record unconfirmed.** *Where:* the ✕ on each card. *Fix:* confirm step or undo toast; demote to hover-revealed corner. *Principle:* error prevention.

### Essays (`components/college/EssaysModule.tsx`)

1. **Tab-within-tab navigation is disorienting.** *Where:* the inner Prompts / Stories / Drafts / Reuse switcher. *Fix:* visually differentiate from the top sub-tabs (pill/segmented style) and persist the last-used view. *Principle:* navigation clarity in nested hierarchies.

2. **Prompts don't show coverage.** *Where:* a prompt card (Prompts view). *Fix:* surface attached story/draft status ("2 drafts, no story yet") and word-count vs limit. *Principle:* progress at a glance.

3. **Add-supplemental reads as secondary.** *Where:* "+ Add supplemental" (Prompts view). *Fix:* make it the clear primary action; hint that common prompts are preloaded. *Principle:* primary-action emphasis.

4. **Draft editor lacks a word counter.** *Where:* the "Write here…" textarea (Drafts view). *Fix:* persistent word counter, soft-cap indicator (vs the 650 limit), more comfortable line-height + max-width. *Principle:* writing-surface ergonomics.

5. **Version history is invisible.** *Where:* the "Save as new version" button (Drafts view; `group_id`/`version` model). *Fix:* add a version list/stepper ("v2 of 2 · view history") so iterations are visible and revertible. *Principle:* make powerful features legible.

6. **Draft stage select hides progress.** *Where:* the brainstorm/outlining/drafting/revising select. *Fix:* render as a labeled stage indicator / progress chip. *Principle:* status visibility across many drafts.

### Academics (`components/college/AcademicsModule.tsx`)

1. **GPA tiles lack scale + hierarchy.** *Where:* Unweighted 3.67 / Weighted 4.50 / AP count tiles. *Fix:* larger tabular numerals, state the scale (out of 4.0 / 5.0), separate the rigor count so GPA reads as primary. *Principle:* emphasis + clarity on the headline metric.

2. **Course rows are hard to scan.** *Where:* the course list. *Fix:* align into columns (Course | Rigor | Grade | Year) with a header; color rigor (AP/Honors) subtly so it reads like a transcript. *Principle:* tabular legibility.

3. **Planned vs completed courses are blurred.** *Where:* the "Senior-year plan" section mixed with completed rows. *Fix:* visually separate planned courses (muted/dashed/"Planned" header), exclude them from earned GPA, and show a projected GPA. *Principle:* don't conflate actual vs projected.

4. **"mark taken" effect is unclear.** *Where:* the "mark taken" control on planned courses. *Fix:* clearer label ("Mark as completed") plus confirmation / grade-entry prompt, since it changes a computed metric. *Principle:* clarity on consequential actions.

5. **Add course is low-prominence.** *Where:* "+ Add course". *Fix:* consistent primary/dashed add; consider an inline quick-add row at the bottom of the table. *Principle:* action consistency / speed.

### Testing (`components/college/TestingModule.tsx`)

1. **Superscore meaning isn't explained.** *Where:* the "1480 SAT superscore" display. *Fix:* hero stat treatment with a short explainer tooltip and the section breakdown that produced it. *Principle:* make computed features authoritative.

2. **Taken scores lack goal comparison.** *Where:* the "Taken" section (SAT EBRW 720 / Math 760). *Fix:* show each score vs its goal (e.g. 760/800) with a subtle progress bar. *Principle:* data-driven decisions (retake or not).

3. **Planned sittings don't behave like deadlines.** *Where:* the "Planned" section (AP Calculus, dated). *Fix:* surface a countdown ("in 5 days") and registration status. *Principle:* time-based urgency.

4. **Goals are muted trailing text.** *Where:* "goal 5", "goal 1550" labels. *Fix:* pair each goal with current-vs-goal progress and a visible delta. *Principle:* motivation through progress.

5. **Add-test doesn't reflect the two states.** *Where:* "+ Add test" button. *Fix:* prominent primary; consider splitting "Log a result" vs "Plan a sitting" (the planned/taken model). *Principle:* match controls to the data model.

### Honors (`components/college/HonorsModule.tsx`)

1. **Common App cap isn't enforced visually.** *Where:* the "Common App caps honors at 5" hint. *Fix:* make it an active counter ("2 of 5 used") tied to the list — mirror the dashboard's 5-task-limit pattern. *Principle:* constraint visibility.

2. **Implied ranking can't be reordered.** *Where:* the numbered honor rows. *Fix:* add reorder affordances (drag or up/down); top-ranked honors matter most. *Principle:* give meaning to order with control.

3. **Level prestige is lost.** *Where:* level (National) and grade render as identical muted spans. *Fix:* style level as a colored badge scaled by reach (School < Regional < National < International). *Principle:* encode importance visually.

4. **List leads with entry order, not impact.** *Where:* the honors list. *Fix:* default sort/group by level so the strongest awards lead. *Principle:* lead with the most impressive.

5. **Add stays additive past the cap.** *Where:* "+ Add honor / award". *Fix:* at 5, switch to a swap/curate state ("replace your weakest") rather than allowing an unsubmittable 6th. *Principle:* deliberate limits.

### Recommenders (`components/college/RecommendersModule.tsx`)

1. **Prompt could guide strategy.** *Where:* the "Who might write your recommendations" intro. *Fix:* light guidance (e.g. two core-subject teachers + a counselor) so students plan coverage. *Principle:* helpful defaults.

2. **Status pipeline hidden in a native select.** *Where:* considering/asked/agreed/submitted select. *Fix:* horizontal stepper or colored stage chip so who-still-needs-asking is scannable. *Principle:* pipeline visibility.

3. **Card doesn't surface the action state.** *Where:* each recommender card. *Fix:* lead with name + status chip; add a relationship-strength or last-contacted hint for follow-ups. *Principle:* surface the next action.

4. **Why-fit note is too small.** *Where:* the "Knows my writing growth well" note. *Fix:* more room + a subtle "Why them" label. *Principle:* emphasize the strategic content this tool exists to capture.

5. **Add lacks guidance/cap.** *Where:* "+ Add recommender". *Fix:* consistent primary/dashed add; gentle guidance ("most schools want 2–3") to prevent over-collecting. *Principle:* action consistency + helpful constraint.

---

## Cross-cutting themes (quick wins)
- **Native `<select>` dropdowns** appear in Schools, Essays (draft stage), Testing, and Recommenders and break the visual language — a single shared styled select / segmented-control primitive in `components/college/ui.tsx` would fix all of them at once.
- **"+ Add …" buttons** are uniformly under-emphasized across every College module and Links — standardize one prominent add affordance.
- **Inline ✕ deletes with no confirmation/undo** recur in Links, Activities, Schools — add a shared confirm/undo pattern.
- **Counters for constraints** (5 today-tasks, 5 honors, recommender count, char limits) should be live and visible wherever a cap exists — reuse one pattern.
- **Labels vanishing on filled inputs** (placeholder-only fields) hurt Activities and the dashboard — prefer persistent labels.
