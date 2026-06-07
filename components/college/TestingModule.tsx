"use client";

import { useState } from "react";
import type { CollegeTest } from "@/lib/types";
import { useCollection } from "@/lib/hooks/useCollection";
import { useNow } from "@/lib/hooks/useNow";
import { TEST_KINDS, TEST_STATUSES } from "@/lib/college-reference";
import {
  AddPanel,
  Badge,
  Card,
  DeleteButton,
  Empty,
  Field,
  GhostButton,
  Input,
  PrimaryButton,
  Row,
  Segmented,
  Select,
} from "@/components/college/ui";

// Whole-days until an ISO date (midnight-to-midnight), or null before the clock
// has hydrated. Negative = past.
function daysUntil(dateStr: string, now: number): number | null {
  if (now <= 0) return null;
  const target = new Date(`${dateStr}T00:00:00`).getTime();
  const startOfToday = new Date(new Date(now).toDateString()).getTime();
  return Math.round((target - startOfToday) / 86_400_000);
}

function countdownLabel(days: number): string {
  if (days < 0) return "past";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 30) return `in ${days} days`;
  const weeks = Math.round(days / 7);
  return `in ${weeks} wks`;
}

// Section breakdown per test kind (used for subscores + superscore).
const SECTIONS: Record<string, string[]> = {
  SAT: ["EBRW", "Math"],
  ACT: ["English", "Math", "Reading", "Science"],
  AP: [],
  Other: [],
};

// Superscore: SAT = sum of best section across sittings; ACT = rounded mean of
// best sections; otherwise just the best total. Returns the value plus the
// best-per-section breakdown that produced it, so the number can show its work.
function superscore(
  kind: string,
  taken: CollegeTest[],
): { value: number; parts: { section: string; best: number }[] } | null {
  const sittings = taken.filter((t) => t.kind === kind && t.status === "taken");
  if (sittings.length === 0) return null;
  const sections = SECTIONS[kind] ?? [];
  if (sections.length === 0) {
    const best = Math.max(...sittings.map((t) => t.score ?? 0));
    return best > 0 ? { value: best, parts: [] } : null;
  }
  const parts = sections.map((section) => ({
    section,
    best: Math.max(...sittings.map((t) => t.subscores?.[section] ?? 0)),
  }));
  if (parts.every((p) => p.best === 0)) return null;
  const sum = parts.reduce((a, b) => a + b.best, 0);
  const value = kind === "ACT" ? Math.round(sum / sections.length) : sum;
  return { value, parts };
}

const emptyForm = {
  kind: TEST_KINDS[0] as string,
  label: "",
  test_date: "",
  status: TEST_STATUSES[0] as string,
  score: "",
  goal: "",
  subscores: {} as Record<string, string>,
};

export function TestingModule({
  initial,
  userId,
}: {
  initial: CollegeTest[];
  userId: string;
}) {
  const { items, add, remove } = useCollection<CollegeTest>(
    "college_tests",
    initial,
    userId,
  );
  const [form, setForm] = useState(emptyForm);
  const now = useNow(60000);

  const sections = SECTIONS[form.kind] ?? [];
  const superscored = TEST_KINDS.map((k) => ({
    kind: k,
    detail: superscore(k, items),
  })).filter(
    (s): s is { kind: (typeof TEST_KINDS)[number]; detail: NonNullable<typeof s.detail> } =>
      s.detail != null,
  );

  async function submit(close: () => void) {
    const subscores: Record<string, number> = {};
    for (const [k, v] of Object.entries(form.subscores)) {
      if (v) subscores[k] = Number(v);
    }
    await add({
      kind: form.kind,
      label: form.label.trim() || null,
      test_date: form.test_date || null,
      status: form.status,
      score: form.score ? Number(form.score) : null,
      goal: form.goal ? Number(form.goal) : null,
      subscores,
      notes: null,
    });
    setForm(emptyForm);
    close();
  }

  const upcoming = items
    .filter((t) => t.status === "planned")
    .sort((a, b) => (a.test_date ?? "").localeCompare(b.test_date ?? ""));
  const taken = items.filter((t) => t.status === "taken");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Junior year is the testing window — log planned sittings, not just
        results.
      </p>

      {superscored.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {superscored.map(({ kind, detail }) => (
            <Card
              key={kind}
              className="flex-1 bg-tint-strong"
              // The explainer that demystifies what a superscore is.
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="text-xs uppercase tracking-wide text-muted"
                  title="Your best section scores across every sitting, combined into one total."
                >
                  {kind} superscore
                </span>
              </div>
              <div className="mt-0.5 font-mono text-4xl tabular-nums">
                {detail.value}
              </div>
              {detail.parts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detail.parts.map((p) => (
                    <span
                      key={p.section}
                      className="rounded-full bg-bg px-2 py-0.5 text-xs text-muted"
                    >
                      {p.section} {p.best}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] leading-snug text-muted/80">
                Best section scores across all sittings, combined.
              </p>
            </Card>
          ))}
        </div>
      )}

      <AddPanel label="Add test" onCancelReset={() => setForm(emptyForm)}>
        {(close) => (
          <div className="flex flex-col gap-3">
            <Row>
              <Field label="Test">
                <Select
                  value={form.kind}
                  onChange={(v) =>
                    setForm({ ...form, kind: v, subscores: {} })
                  }
                  options={TEST_KINDS}
                />
              </Field>
              <Field label="Label (e.g. AP subject)">
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="AP Biology"
                />
              </Field>
            </Row>
            <Row>
              <Field label="Date">
                <Input
                  type="date"
                  value={form.test_date}
                  onChange={(e) =>
                    setForm({ ...form, test_date: e.target.value })
                  }
                />
              </Field>
              <Field label="Plan a sitting or log a result?">
                <Segmented
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v })}
                  options={TEST_STATUSES}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Score (actual)">
                <Input
                  type="number"
                  value={form.score}
                  onChange={(e) => setForm({ ...form, score: e.target.value })}
                />
              </Field>
              <Field label="Goal">
                <Input
                  type="number"
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                />
              </Field>
            </Row>
            {sections.length > 0 && (
              <Row>
                {sections.map((sec) => (
                  <Field key={sec} label={sec}>
                    <Input
                      type="number"
                      value={form.subscores[sec] ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          subscores: {
                            ...form.subscores,
                            [sec]: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                ))}
              </Row>
            )}
            <div className="flex gap-2">
              <PrimaryButton type="button" onClick={() => submit(close)}>
                Add
              </PrimaryButton>
              <GhostButton type="button" onClick={close}>
                Cancel
              </GhostButton>
            </div>
          </div>
        )}
      </AddPanel>

      {upcoming.length > 0 && (
        <Card>
          <div className="mb-2 text-sm font-semibold">Planned</div>
          <ul className="flex flex-col gap-1.5">
            {upcoming.map((t) => {
              // Planned sittings behave like deadlines — lead with a countdown.
              const days = t.test_date ? daysUntil(t.test_date, now) : null;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    {days != null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                          days <= 14
                            ? "bg-warning/15 text-warning"
                            : "bg-bg text-accent-soft"
                        }`}
                      >
                        {countdownLabel(days)}
                      </span>
                    )}
                    <span>
                      {t.kind}
                      {t.label ? ` · ${t.label}` : ""}
                    </span>
                    {t.test_date && (
                      <span className="text-xs text-muted">{t.test_date}</span>
                    )}
                    {t.goal != null && (
                      <span className="text-xs text-muted">goal {t.goal}</span>
                    )}
                  </span>
                  <DeleteButton onClick={() => remove(t.id)} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {taken.length > 0 && (
        <Card>
          <div className="mb-2 text-sm font-semibold">Taken</div>
          <ul className="flex flex-col gap-3">
            {taken.map((t) => {
              const hasGoal = t.goal != null && t.score != null;
              const pct = hasGoal
                ? Math.min(100, (t.score! / t.goal!) * 100)
                : 0;
              const met = hasGoal && t.score! >= t.goal!;
              return (
                <li key={t.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      {t.kind}
                      {t.label ? ` · ${t.label}` : ""}
                      <Badge tone="accent">{t.score ?? "—"}</Badge>
                      {Object.entries(t.subscores ?? {}).map(([k, v]) => (
                        <span key={k} className="text-xs text-muted">
                          {k} {v}
                        </span>
                      ))}
                    </span>
                    <DeleteButton onClick={() => remove(t.id)} />
                  </div>
                  {/* Score against goal: a bar plus the explicit delta, so the
                      retake decision has data behind it. */}
                  {hasGoal && (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
                        <div
                          className={`h-full rounded-full ${met ? "bg-accent" : "bg-amber-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span
                        className={`shrink-0 text-xs tabular-nums ${met ? "text-accent-soft" : "text-muted"}`}
                      >
                        {t.score}/{t.goal}
                        {met
                          ? " · goal met"
                          : ` · ${t.goal! - t.score!} to go`}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {items.length === 0 && <Empty>No tests yet — plan your first sitting.</Empty>}
    </div>
  );
}
