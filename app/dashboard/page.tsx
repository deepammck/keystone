import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayInTz, weekStartInTz, weekDatesInTz } from "@/lib/utils";
import { Dashboard } from "@/components/Dashboard";
import { LocalDashboard } from "@/components/LocalDashboard";
import { isLocalMode } from "@/lib/local-mode";
import type { Event, Habit, Profile, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (isLocalMode()) return <LocalDashboard />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Profile | null;
  const timezone = profile?.timezone ?? "America/New_York";
  const today = todayInTz(timezone);
  const weekStart = weekStartInTz(timezone);
  const weekDates = weekDatesInTz(timezone);

  const [tasksRes, inboxRes, eventsRes, habitsRes, logsRes, focusRes, noteRes] =
    await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id).eq("date", today),
      supabase.from("tasks").select("*").eq("user_id", user.id).is("date", null),
      supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("due_at"),
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("position"),
      supabase
        .from("habit_logs")
        .select("habit_id, completed")
        .eq("user_id", user.id)
        .eq("date", today),
      supabase
        .from("focus_sessions")
        .select("duration_seconds, date")
        .eq("user_id", user.id)
        .gte("date", weekStart),
      supabase
        .from("daily_notes")
        .select("content")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle(),
    ]);

  const tasks = (tasksRes.data ?? []) as Task[];
  const inbox = (inboxRes.data ?? []) as Task[];
  const events = (eventsRes.data ?? []) as Event[];
  const habits = (habitsRes.data ?? []) as Habit[];
  const doneHabitIds = (logsRes.data ?? [])
    .filter((r) => r.completed)
    .map((r) => r.habit_id as string);

  const focusRows = (focusRes.data ?? []) as {
    duration_seconds: number;
    date: string;
  }[];
  const todaySeconds = focusRows
    .filter((r) => r.date === today)
    .reduce((sum, r) => sum + r.duration_seconds, 0);

  // Week-level data for the pulse: per-day focus seconds + which days had a
  // completed task / focus session / habit completion.
  const weekFocusByDate: Record<string, number> = {};
  for (const r of focusRows) {
    weekFocusByDate[r.date] = (weekFocusByDate[r.date] ?? 0) + r.duration_seconds;
  }

  const [weekTasksRes, weekLogsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("date, completed")
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("date", weekStart),
    supabase
      .from("habit_logs")
      .select("date, completed")
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("date", weekStart),
  ]);

  const completedTaskDates = new Set(
    (weekTasksRes.data ?? []).map((r) => r.date as string),
  );
  const weekHabitsDone = (weekLogsRes.data ?? []).length;

  return (
    <Dashboard
      userId={user.id}
      timezone={timezone}
      today={today}
      weekStart={weekStart}
      weekDates={weekDates}
      initialTasks={tasks}
      initialInbox={inbox}
      initialEvents={events}
      habits={habits}
      initialDoneHabitIds={doneHabitIds}
      initialTodaySeconds={todaySeconds}
      timerStartedAt={profile?.timer_started_at ?? null}
      weekFocusByDate={weekFocusByDate}
      completedTaskDates={Array.from(completedTaskDates)}
      weekHabitsDone={weekHabitsDone}
      initialNote={noteRes.data?.content ?? ""}
      wakeMinute={profile?.wake_minute ?? 420}
      sleepMinute={profile?.sleep_minute ?? 1380}
      focusGoalMinutes={profile?.focus_goal_minutes ?? 60}
      theme={profile?.theme ?? "dark"}
    />
  );
}
