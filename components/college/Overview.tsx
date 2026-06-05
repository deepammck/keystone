"use client";

import { useState } from "react";
import type { CollegeData } from "@/lib/types";
import { calcGPA } from "@/lib/college-reference";
import { Card } from "@/components/college/ui";

type CollegeTab =
  | "Activities"
  | "Schools"
  | "Essays"
  | "Academics"
  | "Testing"
  | "Honors"
  | "Recommenders";

// Junior-appropriate snapshot: reward the accumulation habit, no deadline panic.
// Uses the SSR/local initial snapshot (a glanceable summary, not live-critical).
export function Overview({
  data,
  onNavigate,
}: {
  data: CollegeData;
  onNavigate?: (tab: CollegeTab) => void;
}) {
  const completedCourses = data.courses.filter((c) => !c.planned);
  const gpa = calcGPA(completedCourses);
  const gpaUw = calcGPA(
    // Unweighted view ignores rigor bonus by treating every course as Regular.
    completedCourses.map((c) => ({ grade: c.grade, rigor: "Regular" })),
  );
  const upcomingTests = data.tests
    .filter((t) => t.status === "planned" && t.test_date)
    .sort((a, b) => (a.test_date ?? "").localeCompare(b.test_date ?? ""))
    .slice(0, 4);
  const essaysInProgress = data.drafts.filter((d) => d.status !== "done").length;
  const researching = data.schools.filter(
    (s) => s.status === "interested" || s.status === "researching",
  ).length;

  const [gpaWeighted, setGpaWeighted] = useState(true);

  // A single directive nudge: the most useful next move given what's logged.
  const nudge = (() => {
    if (data.activities.length === 0)
      return { text: "Start by logging an activity you do.", tab: "Activities" as const };
    if (data.stories.length === 0)
      return { text: "Bank your first essay story while it's fresh.", tab: "Essays" as const };
    if (upcomingTests.length === 0 && data.tests.length === 0)
      return { text: "Plan a test date — junior year is the testing window.", tab: "Testing" as const };
    if (data.schools.length === 0)
      return { text: "Add a few schools to start your research list.", tab: "Schools" as const };
    if (completedCourses.length === 0)
      return { text: "Log your courses to track your GPA.", tab: "Academics" as const };
    return {
      text: "You're logging well — keep banking stories and schools.",
      tab: null,
    };
  })();

  // Accumulation metrics lead (they reward the daily habit); each links to its
  // tab. Schools carries a small target hint so the count reads against a goal.
  const stats: {
    val: number | string;
    label: string;
    tab: CollegeTab;
    hint?: string;
    primary?: boolean;
  }[] = [
    { val: data.activities.length, label: "Activities logged", tab: "Activities", primary: true },
    { val: data.stories.length, label: "Stories banked", tab: "Essays", primary: true },
    { val: data.schools.length, label: "Schools", tab: "Schools", hint: "aim 8–12" },
    { val: essaysInProgress, label: "Essays in progress", tab: "Essays" },
    { val: data.honors.length, label: "Honors", tab: "Honors", hint: "cap 5" },
    { val: researching, label: "In research", tab: "Schools" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Directive next-action nudge so the dashboard points somewhere. */}
      <button
        type="button"
        onClick={() => nudge.tab && onNavigate?.(nudge.tab)}
        disabled={!nudge.tab}
        className={`press flex items-center justify-between gap-3 rounded-2xl bg-accent px-4 py-3 text-left text-on-accent ${
          nudge.tab ? "" : "cursor-default opacity-90"
        }`}
      >
        <span className="flex items-center gap-2.5 text-sm font-medium">
          <span aria-hidden>→</span>
          {nudge.text}
        </span>
        {nudge.tab && <span className="shrink-0 text-sm opacity-80">Go</span>}
      </button>

      {/* GPA gets a dedicated, scrutinized-number treatment: a large serif
          figure, a weighted/unweighted toggle, and the scale it's out of. */}
      <Card className="bg-tint-strong">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-wide text-muted">GPA</div>
          <div className="inline-flex gap-0.5 rounded-lg bg-bg p-0.5 text-xs">
            {(["Weighted", "Unweighted"] as const).map((m) => {
              const on = (m === "Weighted") === gpaWeighted;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGpaWeighted(m === "Weighted")}
                  aria-pressed={on}
                  className={`press rounded-md px-2 py-1 transition-colors ${
                    on ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-text"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-serif text-5xl tabular-nums">
            {gpaWeighted ? gpa.w : gpaUw.uw}
          </span>
          <span className="text-sm text-muted">
            / {gpaWeighted ? "5.0" : "4.0"}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onNavigate?.(s.tab)}
            className={`card rounded-2xl p-4 text-left transition-colors ${
              s.primary ? "bg-tint-strong" : "bg-tint"
            }`}
          >
            <div className={`font-serif ${s.primary ? "text-4xl" : "text-2xl"} tabular-nums`}>
              {s.val}
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">
                {s.label}
              </span>
              {s.hint && <span className="text-[10px] text-muted/70">{s.hint}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
