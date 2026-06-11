"use client";

import { useState } from "react";
import type { CollegeCourse } from "@/lib/types";
import type { Collection } from "@/lib/hooks/useCollection";
import {
  COURSE_RIGOR,
  COURSE_TERMS,
  GRADE_LEVELS,
  GPA_SCALE,
  calcGPA,
} from "@/lib/college-reference";
import {
  AddPanel,
  Card,
  DeleteButton,
  Empty,
  Field,
  GhostButton,
  Input,
  PrimaryButton,
  Row,
  Select,
} from "@/components/college/ui";

const emptyForm = {
  name: "",
  grade_level: GRADE_LEVELS[2] as string, // default 11 (junior)
  term: COURSE_TERMS[0] as string,
  rigor: COURSE_RIGOR[4] as string, // Regular
  grade: "A",
  planned: false,
};

// Subtle rigor colouring so the course list reads like a transcript at a glance.
const RIGOR_TONE: Record<string, string> = {
  AP: "bg-rose-500/15 text-rose-500",
  IB: "bg-rose-500/15 text-rose-500",
  "Dual Enrollment": "bg-amber-500/15 text-amber-500",
  Honors: "bg-amber-500/15 text-amber-500",
  Regular: "bg-bg text-muted",
};

export function AcademicsModule({
  collection,
}: {
  collection: Collection<CollegeCourse>;
}) {
  const { items, add, update, remove } = collection;
  const [form, setForm] = useState(emptyForm);

  // GPA from completed (non-planned, graded) courses only.
  const completed = items.filter((c) => !c.planned);
  const gpa = calcGPA(completed);
  const rigorCount = completed.filter((c) =>
    ["AP", "IB", "Dual Enrollment"].includes(c.rigor),
  ).length;

  const planned = items.filter((c) => c.planned);
  const byLevel = GRADE_LEVELS.map((lvl) => ({
    lvl,
    courses: completed.filter((c) => c.grade_level === lvl),
  })).filter((g) => g.courses.length > 0);

  async function submit(close: () => void) {
    if (!form.name.trim()) return;
    await add({
      name: form.name.trim(),
      grade_level: form.grade_level,
      term: form.term,
      rigor: form.rigor,
      grade: form.planned ? null : form.grade,
      planned: form.planned,
    });
    setForm(emptyForm);
    close();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* GPA is the headline metric — two large figures with their scale, and a
          quieter rigor count beside them so it doesn't compete. */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 gap-3">
          <Card className="flex-1 bg-tint-strong text-center">
            <div className="font-mono text-4xl tabular-nums">{gpa.w}</div>
            <div className="text-sm text-muted">/ 5.0</div>
            <div className="mt-0.5 text-xs uppercase tracking-wide text-muted">
              Weighted
            </div>
          </Card>
          <Card className="flex-1 text-center">
            <div className="font-mono text-4xl tabular-nums">{gpa.uw}</div>
            <div className="text-sm text-muted">/ 4.0</div>
            <div className="mt-0.5 text-xs uppercase tracking-wide text-muted">
              Unweighted
            </div>
          </Card>
        </div>
        <Card className="text-center sm:flex sm:w-32 sm:flex-col sm:justify-center">
          <div className="font-mono text-2xl tabular-nums">{rigorCount}</div>
          <div className="text-xs uppercase tracking-wide text-muted">
            AP/IB/DE
          </div>
        </Card>
      </div>

      <AddPanel label="Add course" onCancelReset={() => setForm(emptyForm)}>
        {(close) => (
          <div className="flex flex-col gap-3">
            <Row>
              <Field label="Course">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="AP Biology"
                  autoFocus
                />
              </Field>
              <Field label="Grade level">
                <Select
                  value={form.grade_level}
                  onChange={(v) => setForm({ ...form, grade_level: v })}
                  options={GRADE_LEVELS}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Term">
                <Select
                  value={form.term}
                  onChange={(v) => setForm({ ...form, term: v })}
                  options={COURSE_TERMS}
                />
              </Field>
              <Field label="Rigor">
                <Select
                  value={form.rigor}
                  onChange={(v) => setForm({ ...form, rigor: v })}
                  options={COURSE_RIGOR}
                />
              </Field>
              {!form.planned && (
                <Field label="Grade">
                  <Select
                    value={form.grade}
                    onChange={(v) => setForm({ ...form, grade: v })}
                    options={Object.keys(GPA_SCALE)}
                  />
                </Field>
              )}
            </Row>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.planned}
                onChange={(e) =>
                  setForm({ ...form, planned: e.target.checked })
                }
              />
              Planned (senior-year course planner — not yet graded)
            </label>
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

      {byLevel.map(({ lvl, courses }) => (
        <Card key={lvl}>
          <div className="mb-2 text-sm font-semibold">Grade {lvl}</div>
          {/* Transcript-style columns with a header so rows scan cleanly. */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1.5 text-sm">
            <div className="grid grid-cols-subgrid text-2xs uppercase tracking-wide text-muted [grid-column:1/-1]">
              <span>Course</span>
              <span className="text-center">Grade</span>
              <span className="text-right">Rigor / term</span>
            </div>
            {courses.map((c) => (
              <div
                key={c.id}
                className="group grid grid-cols-subgrid items-center [grid-column:1/-1]"
              >
                <span className="min-w-0 truncate">{c.name}</span>
                <span className="text-center font-medium tabular-nums">
                  {c.grade}
                </span>
                <span className="flex shrink-0 items-center justify-end gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${RIGOR_TONE[c.rigor] ?? "bg-bg text-muted"}`}
                  >
                    {c.rigor}
                  </span>
                  {c.term && <span className="text-xs text-muted">{c.term}</span>}
                  <DeleteButton onClick={() => remove(c.id)} />
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Planned courses are kept visually distinct (dashed, muted) and excluded
          from the earned GPA above, so actual and projected never blur. */}
      <div className="rounded-2xl border border-dashed border-border bg-tint/40 p-4">
        <div className="mb-2 text-sm font-semibold">
          Senior-year planner{" "}
          <span className="font-normal text-muted">
            — courses you plan to take (not in GPA)
          </span>
        </div>
        {planned.length === 0 ? (
          <p className="text-sm italic text-muted">
            Nothing planned yet. Add a course and check “Planned”.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {planned.map((c) => (
              <PlannedCourseRow
                key={c.id}
                course={c}
                onComplete={(grade) => update(c.id, { planned: false, grade })}
                onDelete={() => remove(c.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {items.length === 0 && <Empty>No courses logged yet.</Empty>}
    </div>
  );
}

// A planned course "marks completed" by capturing the grade it earned — the act
// that moves it into the GPA, so the consequential step is explicit, not a
// silent toggle.
function PlannedCourseRow({
  course: c,
  onComplete,
  onDelete,
}: {
  course: CollegeCourse;
  onComplete: (grade: string) => void;
  onDelete: () => void;
}) {
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState("A");

  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="min-w-0 truncate text-muted">
        {c.name}
        <span> · grade {c.grade_level}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${RIGOR_TONE[c.rigor] ?? "bg-bg text-muted"}`}
        >
          {c.rigor}
        </span>
        {grading ? (
          <span className="flex items-center gap-1.5">
            <Select
              value={grade}
              onChange={setGrade}
              options={Object.keys(GPA_SCALE)}
              className="!min-h-8 !w-auto !px-2 text-sm"
            />
            <button
              type="button"
              onClick={() => onComplete(grade)}
              className="press rounded-md bg-accent px-2 py-1 text-xs font-medium text-on-accent"
            >
              Save grade
            </button>
            <button
              type="button"
              onClick={() => setGrading(false)}
              className="press px-1 text-xs text-muted hover:text-text"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setGrading(true)}
            className="press rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-bg"
          >
            Mark as completed
          </button>
        )}
        <DeleteButton onClick={onDelete} />
      </span>
    </li>
  );
}
