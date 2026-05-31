"use client";

import { useCallback, useEffect, useState } from "react";
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

  const todayTasks = sortTasks(tasks);
  const activeCount = tasks.filter((t) => !t.completed).length;

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId);
    if (data) {
      const all = data as Task[];
      setTasks(all.filter((t) => t.date === today));
      setInbox(all.filter((t) => t.date == null));
    }
  }, [supabase, userId, today]);

  useEffect(() => {
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, refetch]);

  const addTask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (activeCount >= MAX_ACTIVE) {
        setLimitMessage("Finish something first.");
        return;
      }
      setLimitMessage("");
      const optimistic: Task = {
        id: crypto.randomUUID(),
        user_id: userId,
        text: trimmed,
        completed: false,
        completed_at: null,
        date: today,
        position: tasks.length,
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
    [activeCount, supabase, tasks.length, today, userId],
  );

  const addToInbox = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const optimistic: Task = {
        id: crypto.randomUUID(),
        user_id: userId,
        text: trimmed,
        completed: false,
        completed_at: null,
        date: null,
        position: inbox.length,
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
    [inbox.length, supabase, userId],
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
      setInbox((prev) => prev.filter((t) => t.id !== id));
      setTasks((prev) => [...prev, { ...item, date: today, position: prev.length }]);
      await runOrQueue(supabase, {
        table: "tasks",
        op: "update",
        payload: { date: today },
        match: { id },
      });
    },
    [activeCount, inbox, supabase, today],
  );

  const toggleTask = useCallback(
    async (id: string) => {
      let nextCompleted = false;
      const completedAt = () => (nextCompleted ? new Date().toISOString() : null);
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          nextCompleted = !t.completed;
          return { ...t, completed: nextCompleted, completed_at: completedAt() };
        }),
      );
      setLimitMessage("");
      await runOrQueue(supabase, {
        table: "tasks",
        op: "update",
        payload: { completed: nextCompleted, completed_at: completedAt() },
        match: { id },
      });
    },
    [supabase],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setInbox((prev) => prev.filter((t) => t.id !== id));
      setLimitMessage("");
      await runOrQueue(supabase, {
        table: "tasks",
        op: "delete",
        match: { id },
      });
    },
    [supabase],
  );

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
    completedCount: tasks.filter((t) => t.completed).length,
    totalCount: tasks.length,
  };
}
