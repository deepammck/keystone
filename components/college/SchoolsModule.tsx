"use client";

import { useState } from "react";
import type { CollegeSchool } from "@/lib/types";
import type { Collection } from "@/lib/hooks/useCollection";
import { SCHOOL_TAGS } from "@/lib/college-reference";
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
  Select,
} from "@/components/college/ui";

// Tag → accent colour so the reach/target/safety balance reads at a glance.
const TAG_DOT: Record<string, string> = {
  reach: "bg-rose-500",
  target: "bg-amber-500",
  safety: "bg-emerald-500",
};

const emptyForm = {
  name: "",
  tag: SCHOOL_TAGS[0] as string,
};

export function SchoolsModule({
  collection,
}: {
  collection: Collection<CollegeSchool>;
}) {
  const { items, add, remove } = collection;
  const [form, setForm] = useState(emptyForm);

  const counts = SCHOOL_TAGS.map((t) => ({
    tag: t,
    n: items.filter((s) => s.tag === t).length,
  }));

  async function submit(close: () => void) {
    if (!form.name.trim()) return;
    await add({
      name: form.name.trim(),
      tag: form.tag,
      // Columns kept for parity with the schema/other views, defaulted on add.
      location: null,
      status: "interested",
      platform: null,
      deadline_type: null,
      deadline_date: null,
      app_fee: null,
      fee_waiver: false,
      test_policy: null,
      supplements_count: 0,
      acceptance_rate: null,
      fit_notes: null,
      notes: null,
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
              <div className="font-mono text-2xl tabular-nums">{n}</div>
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
          <p className="rounded-lg bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
            {imbalance}
          </p>
        )}
      </div>

      <AddPanel label="Add school" onCancelReset={() => setForm(emptyForm)}>
        {(close) => (
          <div className="flex flex-col gap-3">
            <Field label="School">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="University of …"
                autoFocus
              />
            </Field>
            <Field label="Tag">
              <Select
                value={form.tag}
                onChange={(v) => setForm({ ...form, tag: v })}
                options={SCHOOL_TAGS}
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
  onDelete,
}: {
  school: CollegeSchool;
  onDelete: () => void;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {s.tag && (
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${TAG_DOT[s.tag] ?? "bg-muted"}`}
              title={s.tag}
              aria-hidden
            />
          )}
          <div className="min-w-0 truncate font-medium">{s.name}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {s.tag && <Badge>{s.tag}</Badge>}
          <DeleteButton onClick={onDelete} />
        </div>
      </div>
    </Card>
  );
}
