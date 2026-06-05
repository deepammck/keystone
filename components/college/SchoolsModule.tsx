"use client";

import { useState } from "react";
import type { CollegeSchool } from "@/lib/types";
import { useCollection } from "@/lib/hooks/useCollection";
import {
  SCHOOL_TAGS,
  SCHOOL_STATUSES,
  APP_PLATFORMS,
  DEADLINE_TYPES,
  TEST_POLICIES,
} from "@/lib/college-reference";
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
  Textarea,
} from "@/components/college/ui";

// Tag → accent colour so the reach/target/safety balance reads at a glance.
const TAG_DOT: Record<string, string> = {
  reach: "bg-rose-500",
  target: "bg-amber-500",
  safety: "bg-emerald-500",
};

const emptyForm = {
  name: "",
  location: "",
  tag: SCHOOL_TAGS[0] as string,
  status: SCHOOL_STATUSES[0] as string,
  platform: APP_PLATFORMS[0] as string,
  deadline_type: DEADLINE_TYPES[0] as string,
  deadline_date: "",
  app_fee: "",
  fee_waiver: false,
  test_policy: TEST_POLICIES[1] as string,
  supplements_count: "",
  acceptance_rate: "",
  fit_notes: "",
  notes: "",
};

export function SchoolsModule({
  initial,
  userId,
}: {
  initial: CollegeSchool[];
  userId: string;
}) {
  const { items, add, update, remove } = useCollection<CollegeSchool>(
    "college_schools",
    initial,
    userId,
  );
  const [form, setForm] = useState(emptyForm);

  const counts = SCHOOL_TAGS.map((t) => ({
    tag: t,
    n: items.filter((s) => s.tag === t).length,
  }));

  async function submit(close: () => void) {
    if (!form.name.trim()) return;
    await add({
      name: form.name.trim(),
      location: form.location.trim() || null,
      tag: form.tag,
      status: form.status,
      platform: form.platform,
      deadline_type: form.deadline_type,
      deadline_date: form.deadline_date || null,
      app_fee: form.app_fee ? Number(form.app_fee) : null,
      fee_waiver: form.fee_waiver,
      test_policy: form.test_policy,
      supplements_count: form.supplements_count
        ? Number(form.supplements_count)
        : 0,
      acceptance_rate: form.acceptance_rate.trim() || null,
      fit_notes: form.fit_notes.trim() || null,
      notes: form.notes.trim() || null,
    });
    setForm(emptyForm);
    close();
  }

  const safetyCount = counts.find((c) => c.tag === "safety")?.n ?? 0;
  const imbalance =
    items.length >= 3 && safetyCount === 0
      ? "Add at least one safety — every list needs a sure thing."
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex gap-3">
          {counts.map(({ tag, n }) => (
            <Card key={tag} className="flex-1 text-center">
              <div className="font-serif text-2xl tabular-nums">{n}</div>
              <div className="mt-0.5 flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide text-muted">
                <span
                  className={`h-2 w-2 rounded-full ${TAG_DOT[tag] ?? "bg-muted"}`}
                  aria-hidden
                />
                {tag}
              </div>
            </Card>
          ))}
        </div>
        {imbalance && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-500">
            {imbalance}
          </p>
        )}
      </div>

      <AddPanel label="Add school" onCancelReset={() => setForm(emptyForm)}>
        {(close) => (
          <div className="flex flex-col gap-3">
            <Row>
              <Field label="School">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="University of …"
                  autoFocus
                />
              </Field>
              <Field label="Location">
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="City, State"
                />
              </Field>
            </Row>
            <Row>
              <Field label="Tag">
                <Select
                  value={form.tag}
                  onChange={(v) => setForm({ ...form, tag: v })}
                  options={SCHOOL_TAGS}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v })}
                  options={SCHOOL_STATUSES}
                />
              </Field>
              <Field label="Platform">
                <Select
                  value={form.platform}
                  onChange={(v) => setForm({ ...form, platform: v })}
                  options={APP_PLATFORMS}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Deadline type">
                <Select
                  value={form.deadline_type}
                  onChange={(v) => setForm({ ...form, deadline_type: v })}
                  options={DEADLINE_TYPES}
                />
              </Field>
              <Field label="Deadline date">
                <Input
                  type="date"
                  value={form.deadline_date}
                  onChange={(e) =>
                    setForm({ ...form, deadline_date: e.target.value })
                  }
                />
              </Field>
              <Field label="Test policy">
                <Select
                  value={form.test_policy}
                  onChange={(v) => setForm({ ...form, test_policy: v })}
                  options={TEST_POLICIES}
                />
              </Field>
            </Row>
            <Row>
              <Field label="App fee">
                <Input
                  type="number"
                  min={0}
                  value={form.app_fee}
                  onChange={(e) =>
                    setForm({ ...form, app_fee: e.target.value })
                  }
                />
              </Field>
              <Field label="Supplements (#)">
                <Input
                  type="number"
                  min={0}
                  value={form.supplements_count}
                  onChange={(e) =>
                    setForm({ ...form, supplements_count: e.target.value })
                  }
                />
              </Field>
              <Field label="Acceptance rate">
                <Input
                  value={form.acceptance_rate}
                  onChange={(e) =>
                    setForm({ ...form, acceptance_rate: e.target.value })
                  }
                  placeholder="e.g. 18%"
                />
              </Field>
            </Row>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.fee_waiver}
                onChange={(e) =>
                  setForm({ ...form, fee_waiver: e.target.checked })
                }
              />
              Fee-waiver eligible
            </label>
            <Field label="Fit notes (your GPA/scores vs their ranges)">
              <Textarea
                rows={2}
                value={form.fit_notes}
                onChange={(e) =>
                  setForm({ ...form, fit_notes: e.target.value })
                }
              />
            </Field>
            <Field label="Notes (why interested, visits, contacts)">
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
        <Empty>No schools yet — start your research list.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((s) => (
            <SchoolCard
              key={s.id}
              school={s}
              onUpdate={(patch) => update(s.id, patch)}
              onDelete={() => remove(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SchoolCard({
  school: s,
  onUpdate,
  onDelete,
}: {
  school: CollegeSchool;
  onUpdate: (patch: Partial<CollegeSchool>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {s.tag && (
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TAG_DOT[s.tag] ?? "bg-muted"}`}
              title={s.tag}
              aria-hidden
            />
          )}
          <div className="min-w-0">
            <div className="font-medium">{s.name}</div>
            {s.location && (
              <div className="text-sm text-muted">{s.location}</div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {s.tag && <Badge>{s.tag}</Badge>}
          <DeleteButton onClick={onDelete} />
        </div>
      </div>

      {/* Deadline dominates — it's the field that drives triage. */}
      {(s.deadline_type || s.deadline_date) && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-bg px-2.5 py-1 text-sm">
          <span className="font-semibold text-accent-soft">
            {s.deadline_type || "Deadline"}
          </span>
          {s.deadline_date && (
            <span className="tabular-nums text-muted">{s.deadline_date}</span>
          )}
        </div>
      )}

      <div className="mt-2.5">
        <Segmented
          value={s.status}
          onChange={(v) => onUpdate({ status: v })}
          options={SCHOOL_STATUSES}
          size="sm"
        />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="press mt-2.5 flex items-center gap-1 text-xs font-medium text-muted hover:text-text"
      >
        <span
          className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▸
        </span>
        {expanded ? "Less" : "Details"}
      </button>

      {expanded && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {s.platform && <span>{s.platform}</span>}
            {s.test_policy && <span>Test {s.test_policy}</span>}
            {s.supplements_count > 0 && (
              <span>{s.supplements_count} supplement(s)</span>
            )}
            {s.acceptance_rate && <span>{s.acceptance_rate} accept</span>}
            {s.fee_waiver && <span>fee-waiver</span>}
          </div>
          {s.fit_notes && (
            <p className="mt-2 border-l-2 border-border pl-2.5 text-sm leading-snug text-muted">
              {s.fit_notes}
            </p>
          )}
          {s.notes && (
            <p className="mt-1.5 text-sm leading-snug text-muted">{s.notes}</p>
          )}
        </>
      )}
    </Card>
  );
}
