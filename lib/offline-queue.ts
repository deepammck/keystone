import type { SupabaseClient } from "@supabase/supabase-js";

// A tiny localStorage-backed write queue. UI updates optimistically; the actual
// Supabase write is attempted immediately and, if it fails while offline, the
// operation is parked here and replayed on the next `online` event.

export type QueuedOp = {
  id: string;
  table: string;
  op: "insert" | "update" | "upsert" | "delete";
  payload?: Record<string, unknown>;
  match?: Record<string, unknown>;
  onConflict?: string;
};

const KEY = "keystone:write-queue";

function load(): QueuedOp[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(ops: QueuedOp[]) {
  localStorage.setItem(KEY, JSON.stringify(ops));
}

function enqueue(op: QueuedOp) {
  const ops = load();
  ops.push(op);
  save(ops);
}

async function apply(supabase: SupabaseClient, op: QueuedOp) {
  const q = supabase.from(op.table);
  switch (op.op) {
    case "insert":
      return q.insert(op.payload!);
    case "upsert":
      return q.upsert(op.payload!, op.onConflict ? { onConflict: op.onConflict } : undefined);
    case "update":
      return q.update(op.payload!).match(op.match!);
    case "delete":
      return q.delete().match(op.match!);
  }
}

// Attempt the write now; on network failure, queue it for later replay.
// Returns true if it succeeded immediately.
export async function runOrQueue(
  supabase: SupabaseClient,
  op: Omit<QueuedOp, "id">,
): Promise<boolean> {
  const full: QueuedOp = { ...op, id: crypto.randomUUID() };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueue(full);
    return false;
  }
  const { error } = await apply(supabase, full);
  if (error) {
    enqueue(full);
    return false;
  }
  return true;
}

export async function flushQueue(supabase: SupabaseClient): Promise<void> {
  const ops = load();
  if (ops.length === 0) return;
  const remaining: QueuedOp[] = [];
  for (const op of ops) {
    const { error } = await apply(supabase, op);
    if (error) remaining.push(op);
  }
  save(remaining);
}

export function hasQueuedWrites(): boolean {
  return load().length > 0;
}
