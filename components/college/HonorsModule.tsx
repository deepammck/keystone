"use client";

import { useState } from "react";
import type { CollegeHonor } from "@/lib/types";
import { useCollection } from "@/lib/hooks/useCollection";
import { HONOR_LEVELS, GRADE_LEVELS_WITH_PG, LIMITS } from "@/lib/college-reference";
import {
  AddPanel,
  Card,
  Counter,
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
  title: "",
  level: HONOR_LEVELS[0] as string,
  grade: GRADE_LEVELS_WITH_PG[2] as string,
};

// Prestige rank (higher = more impressive) drives both the default order and the
// badge colour, so the strongest awards lead.
const LEVEL_RANK: Record<string, number> = {
  school: 0,
  state: 1,
  national: 2,
  international: 3,
};
const LEVEL_TONE: Record<string, string> = {
  school: "bg-bg text-muted",
  state: "bg-amber-500/15 text-amber-500",
  national: "bg-accent text-on-accent",
  international: "bg-rose-500/15 text-rose-500",
};

export function HonorsModule({
  initial,
  userId,
}: {
  initial: CollegeHonor[];
  userId: string;
}) {
  const { items, add, update, remove } = useCollection<CollegeHonor>(
    "college_honors",
    initial,
    userId,
  );
  const [form, setForm] = useState(emptyForm);

  // Lead with impact: most-prestigious level first, then the user's own order
  // (created_at, which the up/down controls swap).
  const ordered = [...items].sort((a, b) => {
    const r = (LEVEL_RANK[b.level ?? ""] ?? -1) - (LEVEL_RANK[a.level ?? ""] ?? -1);
    return r !== 0 ? r : a.created_at.localeCompare(b.created_at);
  });

  const atCap = items.length >= LIMITS.honors;

  async function submit(close: () => void) {
    if (!form.title.trim()) return;
    await add({
      title: form.title.trim(),
      level: form.level,
      grade: form.grade,
    });
    setForm(emptyForm);
    close();
  }

  // Reorder within the same level by swapping the created_at sort key with the
  // neighbour. No schema change — created_at is already what the list sorts by.
  function move(index: number, dir: -1 | 1) {
    const a = ordered[index];
    const b = ordered[index + dir];
    if (!a || !b || a.level !== b.level) return;
    update(a.id, { created_at: b.created_at });
    update(b.id, { created_at: a.created_at });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Common App caps honors at {LIMITS.honors} — log everything now, curate
          later.
        </p>
        <Counter used={items.length} cap={LIMITS.honors} unit="used" />
      </div>
      {items.length > LIMITS.honors && (
        <p className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-soft">
          Over the limit — keep your strongest {LIMITS.honors} for the app and
          drop the rest.
        </p>
      )}

      {atCap ? (
        // Past the cap, adding is a curation act, not free accumulation.
        <AddPanel
          label="Add anyway — you'll need to cut one"
          onCancelReset={() => setForm(emptyForm)}
        >
          {(close) => (
            <HonorForm form={form} setForm={setForm} onSubmit={() => submit(close)} onCancel={close} />
          )}
        </AddPanel>
      ) : (
        <AddPanel label="Add honor / award" onCancelReset={() => setForm(emptyForm)}>
          {(close) => (
            <HonorForm form={form} setForm={setForm} onSubmit={() => submit(close)} onCancel={close} />
          )}
        </AddPanel>
      )}

      {items.length === 0 ? (
        <Empty>No honors logged yet.</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {ordered.map((h, i) => {
            const prevSameLevel = ordered[i - 1]?.level === h.level;
            const nextSameLevel = ordered[i + 1]?.level === h.level;
            const withinCap = i < LIMITS.honors;
            return (
              <Card
                key={h.id}
                className={withinCap ? "" : "opacity-60"}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex flex-col">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={!prevSameLevel}
                        onClick={() => move(i, -1)}
                        className="press text-2xs leading-none text-muted hover:text-text disabled:opacity-20"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={!nextSameLevel}
                        onClick={() => move(i, 1)}
                        className="press text-2xs leading-none text-muted hover:text-text disabled:opacity-20"
                      >
                        ▼
                      </button>
                    </span>
                    <span className="min-w-0 truncate font-medium">{h.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {h.level && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${LEVEL_TONE[h.level] ?? "bg-bg text-muted"}`}
                      >
                        {h.level}
                      </span>
                    )}
                    {h.grade && (
                      <span className="text-xs text-muted">
                        grade {h.grade === "13" ? "PG" : h.grade}
                      </span>
                    )}
                    <DeleteButton onClick={() => remove(h.id)} />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HonorForm({
  form,
  setForm,
  onSubmit,
  onCancel,
}: {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Title">
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="National Merit Semifinalist"
          autoFocus
        />
      </Field>
      <Row>
        <Field label="Level">
          <Select
            value={form.level}
            onChange={(v) => setForm({ ...form, level: v })}
            options={HONOR_LEVELS}
          />
        </Field>
        <Field label="Grade received">
          <Select
            value={form.grade}
            onChange={(v) => setForm({ ...form, grade: v })}
            options={GRADE_LEVELS_WITH_PG}
          />
        </Field>
      </Row>
      <div className="flex gap-2">
        <PrimaryButton type="button" onClick={onSubmit}>
          Add
        </PrimaryButton>
        <GhostButton type="button" onClick={onCancel}>
          Cancel
        </GhostButton>
      </div>
    </div>
  );
}
