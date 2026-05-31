"use client";

import { useEffect, useRef, useState } from "react";

type Inputs = {
  tasksAllDone: boolean;
  habitsAllDone: boolean;
  focusGoalReached: boolean;
};

export type Toast = {
  id: number;
  message: string;
  perfect: boolean;
};

// How long the section bloom halo and a popup toast stay alive.
const BLOOM_MS = 1600;
const TOAST_MS = 2800;

const MESSAGES = {
  tasks: "All tasks done.",
  habits: "All habits done.",
  focus: "Focus goal reached.",
  perfect: "A perfect day.",
};

// Fires reward feedback on the *rising edge* of each completion condition — the
// moment a set tips to fully done. Conditions already true on first mount do
// NOT fire (a page that loads already-complete stays quiet).
//
// Each edge drives two things: a transient per-section bloom flag (at the
// source) and a popup toast (pushed onto a queue). When the firing edge leaves
// all three conditions true it's a "perfect day": only the perfect toast is
// pushed (the individual ones are coalesced away) so the screen shows one popup.
export function useCelebrations({
  tasksAllDone,
  habitsAllDone,
  focusGoalReached,
}: Inputs) {
  const [celebrateTasks, setCelebrateTasks] = useState(false);
  const [celebrateHabits, setCelebrateHabits] = useState(false);
  const [celebrateFocus, setCelebrateFocus] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const prev = useRef({
    tasks: tasksAllDone,
    habits: habitsAllDone,
    focus: focusGoalReached,
  });
  const nextId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  useEffect(() => {
    const bloom = (set: (v: boolean) => void) => {
      set(true);
      timers.current.push(setTimeout(() => set(false), BLOOM_MS));
    };
    const pushToast = (message: string, perfect: boolean) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, perfect }]);
      timers.current.push(
        setTimeout(
          () => setToasts((prev) => prev.filter((t) => t.id !== id)),
          TOAST_MS,
        ),
      );
    };

    const p = prev.current;
    const fired: ("tasks" | "habits" | "focus")[] = [];
    if (tasksAllDone && !p.tasks) {
      bloom(setCelebrateTasks);
      fired.push("tasks");
    }
    if (habitsAllDone && !p.habits) {
      bloom(setCelebrateHabits);
      fired.push("habits");
    }
    if (focusGoalReached && !p.focus) {
      bloom(setCelebrateFocus);
      fired.push("focus");
    }
    prev.current = {
      tasks: tasksAllDone,
      habits: habitsAllDone,
      focus: focusGoalReached,
    };

    if (fired.length === 0) return;

    if (tasksAllDone && habitsAllDone && focusGoalReached) {
      pushToast(MESSAGES.perfect, true);
    } else {
      fired.forEach((k) => pushToast(MESSAGES[k], false));
    }
  }, [tasksAllDone, habitsAllDone, focusGoalReached]);

  return { celebrateTasks, celebrateHabits, celebrateFocus, toasts };
}
