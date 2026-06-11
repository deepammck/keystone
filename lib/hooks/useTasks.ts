"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runOrQueue } from "@/lib/offline-queue";
import type { Task } from "@/lib/types";

const MAX_ACTIVE = 5;

// Stable order by position, then creation. Completion does NOT affect order, so
// checking a task leaves it in place (struck through) instead of jumping to the
// bottom of the list.
function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function useTasks(
  initialTasks: Task[],
  initialInbox: Task[],
  userId: string,
  today: string,
) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [inbox, setInbox] = useState<Task[]>(initialInbox);
  const [limitMessage, setLimitMessage] = useState("");
  const [supabase] = useState(() => createClient());

  const todayTasks = useMemo(() => sortTasks(tasks), [tasks]);
  const activeCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);

  // Two scoped queries instead of `select *` on the whole table: completed
  // tasks accumulate on past dates forever (the silent archive), so an
  // unfiltered fetch would re-download the entire history on every realtime
  // event.
  const refetch = useCallback(async () => {
    const [todayRes, inboxRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId).eq("date", today),
      supabase.from("tasks").select("*").eq("user_id", userId).is("date", null),
    ]);
    if (todayRes.data) setTasks(todayRes.data as Task[]);
    if (inboxRes.data) setInbox(inboxRes.data as Task[]);
  }, [supabase, userId, today]);

  const refetchRef = useRef(refetch);
  useEffect(() => { refetchRef.current = refetch; }, [refetch]);

  // Optimistic writes update local state instantly; the realtime subscription
  // then refetches on the resulting postgres change. But a refetch that fires
  // before the write is committed/visible — or one triggered by a stale event
  // from a prior mutation — re-reads the row as unchanged and CLOBBERS the
  // optimistic value (e.g. a freshly-checked task snapping back to incomplete,
  // dropping the X/5 count). So after any local write we hold refetches in a
  // short quiet window and run a single trailing refetch once the write has
  // settled; cross-device changes still arrive on that trailing pass.
  const quietUntilRef = useRef(0);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markLocalWrite = useCallback(() => {
    quietUntilRef.current = Date.now() + 1500;
  }, []);
  const scheduleRefetch = useCallback(() => {
    const wait = Math.max(0, quietUntilRef.current - Date.now());
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(() => {
      refetchTimerRef.current = null;
      refetchRef.current();
    }, wait);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
        () => scheduleRefetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    };
  }, [supabase, userId, scheduleRefetch]);

  const addTask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (activeCount >= MAX_ACTIVE) {
        setLimitMessage("Finish something first.");
        return;
      }
      setLimitMessage("");
      markLocalWrite();
      const optimistic: Task = {
        id: crypto.randomUUID(),
        user_id: userId,
        text: trimmed,
        completed: false,
        completed_at: null,
        date: today,
        // max+1 (not length): after deletions, length collides with surviving
        // positions and ordering would fall back to created_at tie-breaks.
        position: tasks.reduce((m, t) => Math.max(m, t.position), -1) + 1,
        created_at: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, optimistic]);
      await runOrQueue(supabase, {
        table: "tasks",
        op: "insert",
        payload: {
          id: optimistic.id,
          user_id: userId,
          text: trimmed,
          date: today,
          position: optimistic.position,
        },
      });
    },
    [activeCount, markLocalWrite, supabase, tasks, today, userId],
  );

  const addToInbox = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      markLocalWrite();
      const optimistic: Task = {
        id: crypto.randomUUID(),
        user_id: userId,
        text: trimmed,
        completed: false,
        completed_at: null,
        date: null,
        position: inbox.reduce((m, t) => Math.max(m, t.position), -1) + 1,
        created_at: new Date().toISOString(),
      };
      setInbox((prev) => [...prev, optimistic]);
      await runOrQueue(supabase, {
        table: "tasks",
        op: "insert",
        payload: {
          id: optimistic.id,
          user_id: userId,
          text: trimmed,
          date: null,
          position: optimistic.position,
        },
      });
    },
    [inbox, markLocalWrite, supabase, userId],
  );

  const moveToToday = useCallback(
    async (id: string) => {
      if (activeCount >= MAX_ACTIVE) {
        setLimitMessage("Finish something first.");
        return;
      }
      setLimitMessage("");
      const item = inbox.find((t) => t.id === id);
      if (!item) return;
      markLocalWrite();
      const position = tasks.reduce((m, t) => Math.max(m, t.position), -1) + 1;
      setInbox((prev) => prev.filter((t) => t.id !== id));
      // Pulling an item into Today always restarts it as active — a stale
      // completed flag from its inbox life would otherwise arrive pre-struck.
      setTasks((prev) => [
        ...prev,
        { ...item, date: today, position, completed: false, completed_at: null },
      ]);
      await runOrQueue(supabase, {
        table: "tasks",
        op: "update",
        payload: { date: today, position, completed: false, completed_at: null },
        match: { id },
      });
    },
    [activeCount, inbox, markLocalWrite, supabase, tasks, today],
  );

  const toggleTask = useCallback(
    async (id: string) => {
      // Derive the next state synchronously from current state. (Reading it out
      // of the setTasks updater would be too late — React runs that callback
      // during the render phase, after the DB payload below is built, so the
      // write would always persist completed:false and the UI would revert.)
      const current = tasks.find((t) => t.id === id);
      if (!current) return;
      markLocalWrite();
      const nextCompleted = !current.completed;
      const completedAt = nextCompleted ? new Date().toISOString() : null;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, completed: nextCompleted, completed_at: completedAt } : t,
        ),
      );
      setLimitMessage("");
      await runOrQueue(supabase, {
        table: "tasks",
        op: "update",
        payload: { completed: nextCompleted, completed_at: completedAt },
        match: { id },
      });
    },
    [markLocalWrite, supabase, tasks],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      markLocalWrite();
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setInbox((prev) => prev.filter((t) => t.id !== id));
      setLimitMessage("");
      await runOrQueue(supabase, {
        table: "tasks",
        op: "delete",
        match: { id },
      });
    },
    [markLocalWrite, supabase],
  );

  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);

  return {
    tasks: todayTasks,
    inbox,
    addTask,
    addToInbox,
    moveToToday,
    toggleTask,
    deleteTask,
    limitMessage,
    activeCount,
    completedCount,
    totalCount: tasks.length,
  };
}
