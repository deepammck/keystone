"use client";

import { useState } from "react";
import type { CollegeRecommender } from "@/lib/types";
import type { Collection } from "@/lib/hooks/useCollection";
import { RECOMMENDER_STATUSES } from "@/lib/college-reference";
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
  Segmented,
  Textarea,
} from "@/components/college/ui";

// What to do next for each pipeline stage, so the card always points somewhere.
const NEXT_ACTION: Record<string, string> = {
  considering: "Decide and ask them",
  asked: "Waiting on their reply",
  agreed: "Share your resume & deadlines",
  submitted: "Submitted — you're set",
};

const emptyForm = {
  name: "",
  subject: "",
  why_fit: "",
  status: RECOMMENDER_STATUSES[0] as string,
  notes: "",
};

export function RecommendersModule({
  collection,
}: {
  collection: Collection<CollegeRecommender>;
}) {
  const { items, add, update, remove } = collection;
  const [form, setForm] = useState(emptyForm);

  async function submit(close: () => void) {
    if (!form.name.trim()) return;
    await add({
      name: form.name.trim(),
      subject: form.subject.trim() || null,
      why_fit: form.why_fit.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    });
    setForm(emptyForm);
    close();
  }

  const agreedCount = items.filter(
    (r) => r.status === "agreed" || r.status === "submitted",
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Aim for two core-subject teachers who know you well, plus your counselor
        — most schools want 2–3. Light notes for now; you’ll ask senior fall.
        {items.length > 0 && (
          <span className="text-text">
            {" "}
            {agreedCount} of {items.length} on board.
          </span>
        )}
      </p>

      <AddPanel label="Add recommender" onCancelReset={() => setForm(emptyForm)}>
        {(close) => (
          <div className="flex flex-col gap-3">
            <Row>
              <Field label="Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ms. Rivera"
                  autoFocus
                />
              </Field>
              <Field label="Subject / role">
                <Input
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  placeholder="AP Bio teacher"
                />
              </Field>
            </Row>
            <Field label="Why them — what they can speak to">
              <Textarea
                rows={3}
                value={form.why_fit}
                onChange={(e) => setForm({ ...form, why_fit: e.target.value })}
                placeholder="Knows my growth as a writer; saw me lead the lab project…"
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
        <Empty>No recommenders noted yet.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{r.name}</div>
                  {r.subject && (
                    <div className="text-sm text-muted">{r.subject}</div>
                  )}
                </div>
                <DeleteButton onClick={() => remove(r.id)} />
              </div>

              {/* The status pipeline reads as a stepper, with the next action
                  spelled out so "who still needs asking" is obvious. */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Segmented
                  value={r.status}
                  onChange={(v) => update(r.id, { status: v })}
                  options={RECOMMENDER_STATUSES}
                  size="sm"
                />
                {NEXT_ACTION[r.status] && (
                  <span
                    className={`text-xs ${r.status === "submitted" ? "text-accent-soft" : "text-muted"}`}
                  >
                    {r.status === "submitted" ? "✓ " : "→ "}
                    {NEXT_ACTION[r.status]}
                  </span>
                )}
              </div>

              {r.why_fit && (
                <div className="mt-2.5">
                  <div className="text-xs uppercase tracking-wide text-muted">
                    Why them
                  </div>
                  <p className="mt-1 border-l-2 border-border pl-2.5 text-sm leading-relaxed">
                    {r.why_fit}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
