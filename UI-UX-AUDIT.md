# UI/UX Audit — Keystone / Links / College

**Method:** Two passes over the real design tokens (`app/globals.css`) and every component, cross-referenced against the `ui-ux-pro-max` rule sets (accessibility, touch, neumorphism, responsive, typography). Neumorphism's known weakness per the skill DB is **low contrast** — "Soft UI Evolution" recommends WCAG AA+, visible focus, 200–300 ms motion. Findings are graded; each notes whether it respects the documented constraint *"depth = dark soft shadow only, no glowing white highlight rim"* ([[neumorphic-aesthetic]]).

Static a11y facts gathered: **58** `focus:ring` usages (nearly all on inputs) vs **59** `.press` buttons and only **4** `focus-visible` in the whole component tree; `--bg` and `--tint` are byte-identical in both themes.

---

## PASS 1 — Structural (hierarchy, contrast, a11y, responsive)

### P1. Cards barely separate from the page in dark mode — HIGH
`--bg: #1c1b19` and `--tint: #1c1b19` are **identical**, so a `.card` (`bg-tint`) is the same fill as the page behind it. Depth rests on two cues that are both weak on a near-black surface: a `rgba(255,255,255,0.05)` hairline (≈invisible) and a *dark* drop shadow (`rgba(0,0,0,0.6)` — but there's almost nothing darker than `#1c1b19` to cast onto). Result: tasks/habits/deadlines/notepad cards read as one flat plane in dark mode; the soft-UI extrusion the whole aesthetic is built on mostly disappears. (Mocha works — light bg gives the brown shadow room to read.)
**Fix that respects the no-white-rim rule:** make `--tint` *lighter* than `--bg` in dark mode (e.g. bg `#191816`, tint `#211f1d`) so the card lifts by fill, not by a forbidden highlight. Alternatively bump the hairline to ~8–10% white. This is a fill/border change, not a highlight rim.

### P2. Keyboard focus is invisible on most buttons — HIGH (a11y, skill's #1 rule)
Inputs get `focus:ring-2 focus:ring-ring` (the `--color-ring` fix is good). But the ~59 `.press` icon/action buttons — transport controls, College sub-tabs, AppSwitcher tabs, delete/edit, settings gear, day/week arrows, goal × — have **no `focus-visible` style at all**; they only style `:hover`. A keyboard or switch user tabbing through has no idea where they are. `globals.css` has zero `:focus` rules.
**Fix:** one global rule — `.press:focus-visible, button:focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px; }` — covers everything at once.

### P3. Inset inputs are nearly invisible in dark mode — MEDIUM
`.neu-field`/inputs use `--neu-inset` (an inset *dark* shadow). On `#1c1b19` with bg also `#1c1b19`, a recessed dark input looks identical to a flat card — users can't tell what's typeable until focus. Same root cause as P1. Lightening `--tint` (P1) fixes inputs too; otherwise give fields a faint inset top-edge or a hair more border.

### P4. Body/label text frequently below the 16 px mobile minimum — MEDIUM
Heavy reliance on `text-xs` (12), `text-2xs` (10), `text-[11px]`, `text-[13px]` for chips, countdowns, heatmap labels, hints, the notepad meta, College badges. The skill's `readable-font-size` rule wants ≥16 px body on mobile. The single-screen density goal explains it, but the **10 px** heatmap/legend labels and `text-muted/70` hints are the worst offenders for legibility.
**Fix:** floor incidental labels at 12 px and lift `text-2xs` (10) to 11–12; reserve the tiniest sizes for truly decorative text.

### P5. `<16px` form fields trigger iOS auto-zoom — MEDIUM (touch)
Notepad textarea, Links tags input, the inline LinkItem/Draft/Story/Recommender fields render at `text-sm` (14 px). Mobile Safari force-zooms any focused input under 16 px, then doesn't zoom back — jarring on the capture-first flows.
**Fix:** make focusable inputs/textareas ≥16 px on mobile (`text-base` up to `sm:`).

### P6. Muted-on-muted hints risk failing 4.5:1 — MEDIUM (contrast)
`text-muted/70` and `text-muted/80` at `text-2xs` (Overview "aim 8–12", heatmap "Less/More", notepad "Yesterday —", draft prompt subtitles). Base `--muted` passes (~8:1 dark, ~6.9:1 mocha), but at 70 % opacity over the surface the effective ratio drops toward/under 4.5:1, especially in mocha.
**Fix:** drop the opacity modifier on small text; if a quieter tone is needed, define a dedicated `--muted-2` that still clears 4.5:1.

### P7. Color-only data encodings — LOW→MEDIUM (a11y)
Deadline urgency is color-coded but now also carries an AlertTriangle <24 h (good, partial). The habit 7-day dot strip, the heatmap intensity ramp, and the school reach/target/safety dots encode meaning largely in hue. Heatmap exposes data only through `title=` (not keyboard/SR reachable). School tags are saved by also showing the text Badge.
**Fix:** give the heatmap an SR-only summary or `aria-label` per cell; ensure the habit strip has a non-color affordance (today's ring is a start).

### P8. Sub-44px touch targets — LOW (touch)
Most actions are a proper 44 px (`min-h-11`, `h-11 w-11`). Exceptions: the **goal-pill × (20 px)**, the **Honors ▲/▼ reorder arrows (`text-2xs`)**, LinkItem tag chips (`py-0.5`), and the WeekHistory session delete (`h-7 w-7`, 28 px). Fine on a mouse, fiddly on touch.
**Fix:** pad the hit area (transparent padding) to 44 px without growing the visual glyph.

---

## PASS 2 — Per-surface detail

### Keystone `/dashboard`
- **D1 (MEDIUM):** The header is a 3-wide flex of date overline + progress chips + goal pills + gear. On mid widths the goal pills (middle dead-band) can crowd the chips before wrapping; verify the order-1/2/3 reflow at ~600–800 px so goals don't collide with the gear.
- **D2 (LOW):** Progress chips, the heatmap "This week" stat, and WeekHistory all surface overlapping week metrics (tasks done, focus). Mild redundancy — fine, but the heatmap "Progress" card + WeekHistory "past weeks" can read as two takes on the same data stacked vertically.
- **D3 (LOW):** FocusTimer is the hero but visually weighs the same as the Tasks card (both `bg-tint` slabs). Its LCD inset (`neu-screen`) is the one place depth reads in dark mode — lean into that; the transport buttons could carry slightly more presence as the primary action.
- **D4 (LOW):** Swipe-to-delete on tasks is invisible (now that it's fixed mechanically) — there's no affordance hint that a left-swipe deletes; the always-visible × on touch covers it, so consider this informational.
- **D5 (LOW):** `.card:hover` lifts `translateY(-2px)` on every card — on a dense dashboard that's a lot of independent hover motion; acceptable, but the lift is one more thing that doesn't read in dark mode (shadow-based).

### Links `/links`
- **L1 (MEDIUM):** Masonry via CSS `columns` means tab/DOM order is **column-major, not visual top-to-bottom** — keyboard and screen-reader traversal jumps down column 1 then back up to column 2. For a reverse-chronological list this scrambles "newest first" for non-mouse users. Consider a fl/grid masonry that preserves source order, or accept and document.
- **L2 (LOW):** Favicon `<img>` from `google.com/s2/favicons` has `alt=""` (correct, decorative) but no width/height reservation beyond the class — fine; just confirm no layout shift as 16 px favicons load into the masonry (can re-flow columns).
- **L3 (LOW):** The capture form's "Save link" button is `bg-text` (inverted) while most primaries are `bg-accent` — intentional emphasis, but it's the one inverted button in the app; verify it still reads as primary in mocha.

### College `/college`
- **C1 (MEDIUM):** Eight sub-tabs scroll horizontally on mobile with a right-edge fade. The fade signals overflow but there's no left-edge fade once scrolled, and the active tab can be off-screen on load. Consider auto-scrolling the active tab into view on mount.
- **C2 (LOW):** Two stacked tab systems on Essays — the underline sub-tabs (top) and the segmented Prompts/Stories/Drafts/Reuse control — plus the App switcher above. Three nav layers in ~120 px of vertical space is a lot of "where am I"; the segmented bar's filled-accent active state helps, keep it visually distinct from the underline row.
- **C3 (LOW):** Overview stat tiles are buttons (good, navigable) but look like static cards — no hover/cursor cue that they're clickable beyond `transition-colors`. Add `cursor-pointer` + a clearer hover (border/shadow) so the "tap a stat to jump to its tab" affordance is discoverable.
- **C4 (LOW):** Dense transcript grid in Academics (`grid-cols-subgrid`, `text-2xs` headers) is elegant but pushes the smallest type in the app; ties back to P4.

---

## What's already strong (don't touch)
- **Motion discipline:** rich micro-interactions (check-pop, strike-draw, timer-breathe, bloom, confetti) **all** gated under `prefers-reduced-motion` — exemplary.
- **Focus-ring color fix:** `--color-ring: --accent-soft` deliberately chosen to clear every theme — the right call (the gap is *coverage*, P2, not the color).
- **Type system:** DM Sans / DM Mono "receipts" split is consistent and characterful; section-title gold rule is a nice editorial signature.
- **Mocha theme** is well-balanced and contrast-safe; the dark theme is where the contrast work is needed (P1/P3).
- **Scrollbar-gutter stable**, safe-area insets, reduced-motion, and the no-white-rim shadow discipline are all handled with care.

---

## Recommended order if you act on this
1. **P2** (global `focus-visible`) — one rule, biggest a11y win, zero visual cost.
2. **P1 + P3** (lighten `--tint` vs `--bg` in dark mode) — one token change, restores the entire soft-UI depth in dark mode and fixes inputs. Respects the no-white-rim constraint.
3. **P5 + P4** (≥16 px focusable inputs, floor tiny labels) — mobile legibility + kills iOS zoom.
4. **P6, P7, P8, C1/C3** — polish.

> Per your instruction, no code was changed in this pass — these are findings only.
