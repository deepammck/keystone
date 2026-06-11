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
  attempts?: number;
};

const KEY = "keystone:write-queue";
// Safety valve for ops the network-error heuristic misclassifies: after this
// many reconnect attempts a stuck op is dropped instead of poisoning the queue
// forever. Genuine offline periods don't burn attempts (flushQueue exits early).
const MAX_ATTEMPTS = 25;

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

// A server that actually answered (RLS violation, constraint error, bad
// payload) sets a Postgrest error code — replaying the identical op can never
// succeed, so those must NOT be queued. Network-layer failures (offline, DNS,
// aborted fetch) surface with an empty/absent code and are safe to retry.
function isRetryable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return !code;
}

// Attempt the write now; on network failure, queue it for later replay.
// Returns true if it succeeded immediately.
export async function runOrQueue(
  supabase: SupabaseClient,
  op: Omit<QueuedOp, "id">,
): Promise<boolean> {
  const full: QueuedOp = { ...op, id: crypto.randomUUID(), attempts: 0 };

  // Preserve write order: while earlier ops are parked, a new write must not
  // jump the line (e.g. a queued delete replaying after a fresh update on the
  // same row). Append it and try to drain the whole queue in order instead.
  if (hasQueuedWrites()) {
    enqueue(full);
    await flushQueue(supabase);
    return !load().some((o) => o.id === full.id);
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueue(full);
    return false;
  }
  const { error } = await apply(supabase, full);
  if (error) {
    if (isRetryable(error)) {
      enqueue(full);
    } else {
      // Server rejected it — surface instead of retrying forever.
      console.error(`Keystone: write to "${op.table}" rejected`, error);
    }
    return false;
  }
  return true;
}

// Re-entrancy guard (per tab). Multi-tab double-flush is still possible since
// the queue lives in shared localStorage — inserts carry client-generated ids
// so a duplicate replay fails harmlessly on the primary key.
let flushing = false;

export async function flushQueue(supabase: SupabaseClient): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  flushing = true;
  try {
    const ops = load();
    if (ops.length === 0) return;
    const remaining: QueuedOp[] = [];
    let blocked = false;
    for (const op of ops) {
      // Once one op fails on the network, keep everything after it queued in
      // order — applying later ops first would reorder writes.
      if (blocked) {
        remaining.push(op);
        continue;
      }
      const { error } = await apply(supabase, op);
      if (!error) continue;
      if (isRetryable(error)) {
        const attempts = (op.attempts ?? 0) + 1;
        if (attempts >= MAX_ATTEMPTS) {
          console.error(
            `Keystone: dropping queued write to "${op.table}" after ${attempts} attempts`,
            op,
          );
          continue;
        }
        remaining.push({ ...op, attempts });
        blocked = true;
      } else {
        console.error(`Keystone: queued write to "${op.table}" rejected`, error);
      }
    }
    save(remaining);
  } finally {
    flushing = false;
  }
}

export function hasQueuedWrites(): boolean {
  return load().length > 0;
}
