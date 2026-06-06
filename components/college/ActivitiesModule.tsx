"use client";

import { useState } from "react";
import type { CollegeActivity } from "@/lib/types";
import { useCollection } from "@/lib/hooks/useCollection";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_TIMING,
  ACTIVITY_STATUS,
  GRADE_LEVELS_WITH_PG,
  LIMITS,
} from "@/lib/college-reference";
import {
  AddPanel,
  Badge,
  Card,
  CharCounter,
  DeleteButton,
  Empty,
  Field,
  GhostButton,
  Input,
  PrimaryButton,
  Row,
  Select,
  Textarea,
} from "@/components/college/ui";

const gradeLabel = (g: number) => (g === 13 ? "PG" : String(g));

const emptyForm = {
  name: "",
  category: ACTIVITY_CATEGORIES[0] as string,
  role: "",
  organization: "",
  timing: ACTIVITY_TIMING[0] as string,
  hours_per_week: "",
  weeks_per_year: "",
  status: ACTIVITY_STATUS[0] as string,
  description: "",
  notes: "",
  grades: [] as number[],
};

export function ActivitiesModule({
  initial,
  userId,
}: {
  initial: CollegeActivity[];
  userId: string;
}) {
  const { items, add, update, remove } = useCollection<CollegeActivity>(
    "college_activities",
    initial,
    userId,
  );
  const [form, setForm] = useState(emptyForm);

  const shortlisted = items.filter((a) => a.ca_candidate).length;

  function toggleGrade(g: number) {
    setForm((f) => ({
      ...f,
      grades: f.grades.includes(g)
        ? f.grades.filter((x) => x !== g)
        : [...f.grades, g].sort((a, b) => a - b),
    }));
  }

  async function submit(close: () => void) {
    if (!form.name.trim()) return;
    await add({
      name: form.name.trim(),
      category: form.category,
      role: form.role.trim() || null,
      organization: form.organization.trim() || null,
      timing: form.timing,
      hours_per_week: form.hours_per_week ? Number(form.hours_per_week) : null,
      weeks_per_year: form.weeks_per_year ? Number(form.weeks_per_year) : null,
      status: form.status,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      grades: form.grades,
      continue_in_college: false,
      ca_candidate: false,
      position: items.length,
    });
    setForm(emptyForm);
    close();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        A living log — dump everything in now, curate the Common App top{" "}
        {LIMITS.activitiesShortlist} later. {shortlisted}/
        {LIMITS.activitiesShortlist} shortlisted
        {shortlisted > LIMITS.activitiesShortlist && (
          <span className="text-accent">
            {" "}
            — over the Common App limit, trim your shortlist.
          </span>
        )}
      </p>

      <AddPanel label="Add activity" onCancelReset={() => setForm(emptyForm)}>
        {(close) => (
          <div className="flex flex-col gap-3">
            <Row>
              <Field label="Activity">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Science Olympiad"
                  autoFocus
                />
              </Field>
              <Field label="Category">
                <Select
                  value={form.category}
                  onChange={(v) => setForm({ ...form, category: v })}
                  options={ACTIVITY_CATEGORIES}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Role / position">
                <Input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Captain"
                />
              </Field>
              <Field label="Organization">
                <Input
                  value={form.organization}
                  onChange={(e) =>
                    setForm({ ...form, organization: e.target.value })
                  }
                  placeholder="School team"
                />
              </Field>
            </Row>
            <Row>
              <Field label="Hours / week">
                <Input
                  type="number"
                  min={0}
                  value={form.hours_per_week}
                  onChange={(e) =>
                    setForm({ ...form, hours_per_week: e.target.value })
                  }
                />
              </Field>
              <Field label="Weeks / year">
                <Input
                  type="number"
                  min={0}
                  value={form.weeks_per_year}
                  onChange={(e) =>
                    setForm({ ...form, weeks_per_year: e.target.value })
                  }
                />
              </Field>
              <Field label="Timing">
                <Select
                  value={form.timing}
                  onChange={(v) => setForm({ ...form, timing: v })}
                  options={ACTIVITY_TIMING}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v })}
                  options={ACTIVITY_STATUS}
                />
              </Field>
            </Row>
            <div>
              <span className="text-xs uppercase tracking-wide text-muted">
                Grade levels
              </span>
              <div className="mt-1.5 flex gap-1.5">
                {GRADE_LEVELS_WITH_PG.map((g) => {
                  const n = Number(g);
                  const on = form.grades.includes(n);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGrade(n)}
                      className={`press h-9 w-10 rounded-lg text-sm font-medium ${
                        on ? "bg-text text-bg" : "bg-bg text-muted"
                      }`}
                    >
                      {gradeLabel(n)}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Description (brain dump — tighten the 150-char version later)">
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <Field label="Notes (accomplishments, things to mention)">
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
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

      {items.length === 0 ? (
        <Empty>No activities yet — start logging everything.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              onUpdate={(patch) => update(a.id, patch)}
              onDelete={() => remove(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityCard({
  activity: a,
  onUpdate,
  onDelete,
}: {
  activity: CollegeActivity;
  onUpdate: (patch: Partial<CollegeActivity>) => void;
  onDelete: () => void;
}) {
  const [ca, setCa] = useState(a.ca_description ?? "");
  // The Common App curation controls expand on demand so each card reads as a
  // compact summary by default rather than an always-open edit form. Auto-open
  // for activities already flagged as candidates so their work stays in view.
  const [expanded, setExpanded] = useState(a.ca_candidate);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{a.name}</div>
          {(a.role || a.organization) && (
            <div className="text-sm text-accent-soft">
              {[a.role, a.organization].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {a.ca_candidate && (
            <Badge tone="accent">
              CA{a.ca_rank ? ` #${a.ca_rank}` : ""}
            </Badge>
          )}
          {a.category && <Badge>{a.category}</Badge>}
          <DeleteButton onClick={onDelete} />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {a.grades.length > 0 && (
          <span>
            Grades {a.grades.map((g) => (g === 13 ? "PG" : g)).join(", ")}
          </span>
        )}
        {a.hours_per_week != null && <span>{a.hours_per_week} hrs/wk</span>}
        {a.weeks_per_year != null && <span>{a.weeks_per_year} wks/yr</span>}
        {a.timing && <span>{a.timing}</span>}
        <span className="capitalize">{a.status}</span>
      </div>

      {a.description && (
        <p className="mt-2 border-l-2 border-border pl-2.5 text-sm leading-snug text-muted">
          {a.description}
        </p>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="press mt-3 flex items-center gap-1 text-xs font-medium text-muted hover:text-text"
      >
        <span
          className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▸
        </span>
        Common App curation
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg bg-bg p-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={a.ca_candidate}
                onChange={(e) => onUpdate({ ca_candidate: e.target.checked })}
              />
              Common App candidate
            </label>
            {a.ca_candidate && (
              <label className="flex items-center gap-1.5 text-sm text-muted">
                Rank
                <input
                  type="number"
                  min={1}
                  value={a.ca_rank ?? ""}
                  onChange={(e) =>
                    onUpdate({
                      ca_rank: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="h-8 w-14 rounded-md bg-tint px-2 outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            )}
            <label className="flex items-center gap-1.5 text-sm text-muted">
              <input
                type="checkbox"
                checked={a.continue_in_college}
                onChange={(e) =>
                  onUpdate({ continue_in_college: e.target.checked })
                }
              />
              Continue in college
            </label>
          </div>
          <div className="mt-2">
            <span className="text-xs uppercase tracking-wide text-muted">
              Common App description (≤{LIMITS.activityDescriptionChars} chars)
            </span>
            <textarea
              rows={2}
              value={ca}
              onChange={(e) => setCa(e.target.value)}
              onBlur={() =>
                ca !== (a.ca_description ?? "") &&
                onUpdate({ ca_description: ca || null })
              }
              placeholder="Tighten the brain dump down to this"
              className="mt-1 w-full resize-y rounded-md bg-tint px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-1 text-right">
              <CharCounter count={ca.length} limit={LIMITS.activityDescriptionChars} />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
