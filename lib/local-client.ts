/* eslint-disable @typescript-eslint/no-explicit-any */
// A localStorage-backed stand-in for the Supabase browser client. It implements
// exactly the slice of the supabase-js API this app uses (query builder + auth
// + realtime no-ops) so the existing hooks/components run unchanged in local
// mode. Dev-only; not a complete or correct Supabase implementation.
import { LOCAL_USER_ID } from "@/lib/local-mode";
import { todayInTz, weekStartInTz, weekDatesInTz } from "@/lib/utils";

type Row = Record<string, any>;
type Tables =
  | "profiles"
  | "tasks"
  | "focus_sessions"
  | "habits"
  | "habit_logs"
  | "daily_notes"
  | "events"
  | "links"
  | "college_activities"
  | "college_schools"
  | "essay_prompts"
  | "essay_stories"
  | "essay_drafts"
  | "college_courses"
  | "college_tests"
  | "college_honors"
  | "college_recommenders";

type DB = Record<Tables, Row[]>;

const KEY = "keystone:local-db";

const EMPTY: DB = {
  profiles: [],
  tasks: [],
  focus_sessions: [],
  habits: [],
  habit_logs: [],
  daily_notes: [],
  events: [],
  links: [],
  college_activities: [],
  college_schools: [],
  essay_prompts: [],
  essay_stories: [],
  essay_drafts: [],
  college_courses: [],
  college_tests: [],
  college_honors: [],
  college_recommenders: [],
};

function read(): DB {
  if (typeof window === "undefined") return structuredClone(EMPTY);
  try {
    return { ...structuredClone(EMPTY), ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return structuredClone(EMPTY);
  }
}

function write(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

function profileTz(db: DB): string {
  return (db.profiles[0]?.timezone as string) ?? "America/New_York";
}

// Seed a profile + the three default habits on first use.
export function seedLocal(timezone: string) {
  const db = read();
  if (db.profiles.length === 0) {
    db.profiles.push({
      id: LOCAL_USER_ID,
      timezone,
      timer_started_at: null,
      timer_label: null,
      wake_minute: 420,
      sleep_minute: 1380,
      focus_goal_minutes: 60,
      theme: "dark",
      last_app: "keystone",
      created_at: new Date().toISOString(),
    });
  }
  if (db.habits.length === 0) {
    ["Screentime < 2h", "Sleep @ 10:30 PM", "Read 1 Chapter"].forEach(
      (name, i) =>
        db.habits.push({
          id: crypto.randomUUID(),
          user_id: LOCAL_USER_ID,
          name,
          position: i,
          active: true,
          created_at: new Date().toISOString(),
        }),
    );
  }
  write(db);
}

function withDefaults(table: Tables, row: Row, tz: string): Row {
  const out: Row = { ...row };
  if (out.id == null) out.id = crypto.randomUUID();
  if (out.created_at == null) out.created_at = new Date().toISOString();
  // Default `date` to today only when the caller omitted it entirely. An
  // explicit `date: null` (inbox task) must be preserved.
  if (
    (table === "tasks" || table === "focus_sessions" || table === "habit_logs") &&
    !("date" in out)
  ) {
    out.date = todayInTz(tz);
  }
  if (table === "tasks") {
    out.completed ??= false;
    out.completed_at ??= null;
    out.position ??= 0;
  }
  return out;
}

type Filter = { col: string; val: any; op: "eq" | "gte" | "lt" };

class Query {
  private filters: Filter[] = [];
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row | Row[] | undefined;
  private conflict: string | undefined;
  private orderCol: string | undefined;
  private mode: "many" | "single" | "maybe" = "many";

  constructor(private table: Tables) {}

  select() {
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = payload;
    this.conflict = opts?.onConflict;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, val: any) {
    this.filters.push({ col, val, op: "eq" });
    return this;
  }
  gte(col: string, val: any) {
    this.filters.push({ col, val, op: "gte" });
    return this;
  }
  lt(col: string, val: any) {
    this.filters.push({ col, val, op: "lt" });
    return this;
  }
  match(obj: Row) {
    Object.entries(obj).forEach(([col, val]) => this.eq(col, val));
    return this;
  }
  order(col: string) {
    this.orderCol = col;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => {
      if (f.op === "eq") return row[f.col] === f.val;
      if (f.op === "gte") return row[f.col] >= f.val;
      return row[f.col] < f.val;
    });
  }

  private exec(): any {
    const db = read();
    const tz = profileTz(db);
    const rows = db[this.table];

    if (this.op === "insert" || this.op === "upsert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const inserted: Row[] = [];
      for (const item of items) {
        if (this.op === "upsert") {
          // Default the conflict target to the primary key `id` when no
          // onConflict is given — mirrors Postgres/Supabase, whose upsert
          // targets the PK by default. Without this, profiles upserts that
          // omit onConflict (e.g. {id, theme} from settings, {id, last_app}
          // from the app switcher) appended a NEW row each time instead of
          // merging, so getProfile()'s profiles[0] kept the stale default
          // theme — the "theme resets when navigating to Keystone" bug.
          const keys = (this.conflict ?? "id").split(",").map((k) => k.trim());
          const idx = rows.findIndex((r) => keys.every((k) => r[k] === item[k]));
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], ...item };
            inserted.push(rows[idx]);
            continue;
          }
        }
        const full = withDefaults(this.table, item, tz);
        rows.push(full);
        inserted.push(full);
      }
      write(db);
      return inserted;
    }

    if (this.op === "update") {
      const updated: Row[] = [];
      rows.forEach((r, i) => {
        if (this.matches(r)) {
          rows[i] = { ...r, ...(this.payload as Row) };
          updated.push(rows[i]);
        }
      });
      write(db);
      return updated;
    }

    if (this.op === "delete") {
      db[this.table] = rows.filter((r) => !this.matches(r));
      write(db);
      return [];
    }

    // select
    let result = rows.filter((r) => this.matches(r));
    if (this.orderCol) {
      const col = this.orderCol;
      result = [...result].sort((a, b) =>
        a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0,
      );
    }
    if (this.mode === "single") return result[0] ?? null;
    if (this.mode === "maybe") return result[0] ?? null;
    return result;
  }

  then<TResult1 = { data: any; error: any }>(
    onfulfilled?:
      | ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>)
      | null,
  ): TResult1 | PromiseLike<TResult1> {
    let result: { data: any; error: any };
    try {
      result = { data: this.exec(), error: null };
    } catch (error) {
      result = { data: null, error };
    }
    return onfulfilled ? onfulfilled(result) : (result as TResult1);
  }
}

function channelStub() {
  const chan: any = {
    on: () => chan,
    subscribe: () => chan,
  };
  return chan;
}

export function createLocalClient(): any {
  return {
    from: (table: Tables) => new Query(table),
    channel: () => channelStub(),
    removeChannel: () => {},
    auth: {
      async getUser() {
        return { data: { user: { id: LOCAL_USER_ID } }, error: null };
      },
      async getClaims() {
        return { data: { claims: { sub: LOCAL_USER_ID } }, error: null };
      },
      async signInWithOtp() {
        return { data: {}, error: null };
      },
      async signInWithPassword() {
        return { data: {}, error: null };
      },
      async signOut() {
        return { error: null };
      },
    },
  };
}

// Initial links for the Links tool in local mode — the localStorage analogue of
// the server fetch in app/links/page.tsx. Newest-first.
export function loadLocalLinks(): Row[] {
  const db = read();
  return db.links
    .filter((l) => l.user_id === LOCAL_USER_ID)
    .sort((a, b) =>
      (a.created_at as string) < (b.created_at as string)
        ? 1
        : (a.created_at as string) > (b.created_at as string)
          ? -1
          : 0,
    );
}

// Initial College Tracker data in local mode — the localStorage analogue of the
// SSR fetch in app/college/page.tsx. Each module's rows for the local user,
// oldest-first (forms append).
export function loadLocalCollege() {
  const db = read();
  const mine = (table: Tables) =>
    db[table]
      .filter((r) => r.user_id === LOCAL_USER_ID)
      .sort((a, b) =>
        (a.created_at as string) < (b.created_at as string)
          ? -1
          : (a.created_at as string) > (b.created_at as string)
            ? 1
            : 0,
      );
  return {
    activities: mine("college_activities"),
    schools: mine("college_schools"),
    prompts: mine("essay_prompts"),
    stories: mine("essay_stories"),
    drafts: mine("essay_drafts"),
    courses: mine("college_courses"),
    tests: mine("college_tests"),
    honors: mine("college_honors"),
    recommenders: mine("college_recommenders"),
  };
}

// Build the same initial props the server dashboard computes, but from
// localStorage. Mirrors the queries in app/dashboard/page.tsx.
export function loadLocalInitial(timezone: string) {
  seedLocal(timezone);
  const db = read();
  const tz = profileTz(db);
  const today = todayInTz(tz);
  const weekStart = weekStartInTz(tz);
  const weekDates = weekDatesInTz(tz);

  const tasks = db.tasks.filter(
    (t) => t.user_id === LOCAL_USER_ID && t.date === today,
  );
  const inbox = db.tasks.filter(
    (t) => t.user_id === LOCAL_USER_ID && t.date == null,
  );
  const events = db.events
    .filter((e) => e.user_id === LOCAL_USER_ID)
    .sort((a, b) =>
      (a.due_at as string) < (b.due_at as string) ? -1 : (a.due_at as string) > (b.due_at as string) ? 1 : 0,
    );
  const habits = db.habits
    .filter((h) => h.user_id === LOCAL_USER_ID && h.active !== false)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const doneHabitIds = db.habit_logs
    .filter((l) => l.date === today && l.completed)
    .map((l) => l.habit_id as string);

  const focusRows = db.focus_sessions.filter((f) => f.date >= weekStart);
  const todaySeconds = focusRows
    .filter((f) => f.date === today)
    .reduce((s, f) => s + (f.duration_seconds as number), 0);
  const weekFocusByDate: Record<string, number> = {};
  for (const f of focusRows) {
    weekFocusByDate[f.date] =
      (weekFocusByDate[f.date] ?? 0) + (f.duration_seconds as number);
  }

  const completedTaskDates = Array.from(
    new Set(
      db.tasks
        .filter((t) => t.completed && t.date >= weekStart)
        .map((t) => t.date as string),
    ),
  );
  const weekHabitsDone = db.habit_logs.filter(
    (l) => l.completed && l.date >= weekStart,
  ).length;

  const profile = db.profiles[0];
  const note =
    db.daily_notes.find((n) => n.user_id === LOCAL_USER_ID && n.date === today)
      ?.content ?? "";

  return {
    userId: LOCAL_USER_ID,
    timezone: tz,
    today,
    weekStart,
    weekDates,
    initialTasks: tasks as any,
    initialInbox: inbox as any,
    initialEvents: events as any,
    habits: habits as any,
    initialDoneHabitIds: doneHabitIds,
    initialTodaySeconds: todaySeconds,
    timerStartedAt: (profile?.timer_started_at as string | null) ?? null,
    weekFocusByDate,
    completedTaskDates,
    weekHabitsDone,
    initialNote: note,
    wakeMinute: (profile?.wake_minute as number) ?? 420,
    sleepMinute: (profile?.sleep_minute as number) ?? 1380,
    focusGoalMinutes: (profile?.focus_goal_minutes as number) ?? 60,
    theme: (profile?.theme as string) ?? "dark",
  };
}
