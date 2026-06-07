"use client";

import { useState } from "react";
import type { CollegeActivity } from "@/lib/types";
import { useCollection } from "@/lib/hooks/useCollection";
import { LIMITS } from "@/lib/college-reference";
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
  Textarea,
} from "@/components/college/ui";

const emptyForm = {
  name: "",
  notes: "",
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

  async function submit(close: () => void) {
    if (!form.name.trim()) return;
    await add({
      name: form.name.trim(),
      notes: form.notes.trim() || null,
      // Columns kept for parity with the schema/other views, defaulted on add.
      category: null,
      role: null,
      organization: null,
      timing: null,
      hours_per_week: null,
      weeks_per_year: null,
      description: null,
      status: "active",
      grades: [],
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
            <Field label="Activity">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Science Olympiad"
                autoFocus
              />
            </Field>
            <Field label="Notes">
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Role, accomplishments, anything to remember"
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
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 font-medium">{a.name}</div>
        <div className="flex shrink-0 items-center gap-2">
          {a.ca_candidate && <Badge tone="accent">CA</Badge>}
          <DeleteButton onClick={onDelete} />
        </div>
      </div>

      {a.notes && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-snug text-muted">
          {a.notes}
        </p>
      )}

      <label className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted">
        <input
          type="checkbox"
          checked={a.ca_candidate}
          onChange={(e) => onUpdate({ ca_candidate: e.target.checked })}
        />
        Common App shortlist
      </label>
    </Card>
  );
}
