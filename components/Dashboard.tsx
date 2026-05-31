"use client";

import { useCallback, useState } from "react";
import type { Event, Habit, Task } from "@/lib/types";
import { useTasks } from "@/lib/hooks/useTasks";
import { useTimer } from "@/lib/hooks/useTimer";
import { useHabits } from "@/lib/hooks/useHabits";
import { useEvents } from "@/lib/hooks/useEvents";
import { useRollover } from "@/lib/hooks/useRollover";
import { useOnline } from "@/lib/hooks/useOnline";
import { Header } from "@/components/Header";
import { FocusTimer } from "@/components/FocusTimer";
import { TaskList } from "@/components/TaskList";
import { HabitList } from "@/components/HabitList";
import { Notepad } from "@/components/Notepad";
import { EventList } from "@/components/EventList";
import { WeekHistory } from "@/components/WeekHistory";
import { SettingsModal } from "@/components/SettingsModal";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { CelebrationToast } from "@/components/CelebrationToast";
import { useCelebrations } from "@/lib/hooks/useCelebrations";

type Props = {
  userId: string;
  timezone: string;
  today: string;
  weekStart: string;
  weekDates: string[];
  initialTasks: Task[];
  initialInbox: Task[];
  initialEvents: Event[];
  habits: Habit[];
  initialDoneHabitIds: string[];
  initialTodaySeconds: number;
  timerStartedAt: string | null;
  weekFocusByDate: Record<string, number>;
  completedTaskDates: string[];
  weekHabitsDone: number;
  initialNote: string;
  wakeMinute: number;
  sleepMinute: number;
  focusGoalMinutes: number;
};

export function Dashboard(props: Props) {
  const online = useOnline();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const tasks = useTasks(
    props.initialTasks,
    props.initialInbox,
    props.userId,
    props.today,
  );
  const events = useEvents(props.initialEvents, props.userId);
  const timer = useTimer(
    props.userId,
    props.timerStartedAt,
    props.initialTodaySeconds,
  );
  const habits = useHabits(
    props.habits,
    props.initialDoneHabitIds,
    props.userId,
    props.today,
  );

  const reload = useCallback(() => window.location.reload(), []);
  useRollover(props.userId, props.today, reload);

  const tasksAllDone =
    tasks.totalCount > 0 && tasks.completedCount === tasks.totalCount;
  const habitsAllDone = habits.total > 0 && habits.doneCount === habits.total;
  const focusGoalReached =
    props.focusGoalMinutes > 0 &&
    timer.todaySeconds >= props.focusGoalMinutes * 60;

  const celebration = useCelebrations({
    tasksAllDone,
    habitsAllDone,
    focusGoalReached,
  });

  return (
    <main className="relative z-10 mx-auto flex max-w-[1080px] flex-col gap-6 px-5 pb-[calc(env(safe-area-inset-bottom)+3rem)] pt-10 lg:grid lg:grid-cols-2 lg:items-start">
      <div className="reveal lg:col-span-2">
        <OfflineIndicator online={online} />

        <Header
          timezone={props.timezone}
          completedTasks={tasks.completedCount}
          totalTasks={tasks.totalCount}
          focusSeconds={timer.todaySeconds}
          doneHabits={habits.doneCount}
          totalHabits={habits.total}
          wakeMinute={props.wakeMinute}
          sleepMinute={props.sleepMinute}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      <div className="flex flex-col gap-6">
        <div className="reveal" style={{ animationDelay: "0.06s" }}>
          <FocusTimer
            phase={timer.phase}
            effectiveStart={timer.effectiveStart}
            frozenElapsed={timer.frozenElapsed}
            todaySeconds={timer.todaySeconds}
            onStart={timer.start}
            onPause={timer.pause}
            onResume={timer.resume}
            onStop={timer.stop}
            onCancel={timer.cancel}
            celebrating={celebration.celebrateFocus}
          />
        </div>

        <div className="reveal" style={{ animationDelay: "0.12s" }}>
          <TaskList
            tasks={tasks.tasks}
            inbox={tasks.inbox}
            limitMessage={tasks.limitMessage}
            onAdd={tasks.addTask}
            onAddToInbox={tasks.addToInbox}
            onMoveToToday={tasks.moveToToday}
            onToggle={tasks.toggleTask}
            onDelete={tasks.deleteTask}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="reveal" style={{ animationDelay: "0.09s" }}>
          <HabitList
            habits={props.habits}
            doneIds={habits.doneIds}
            onToggle={habits.toggle}
          />
        </div>

        <div className="reveal" style={{ animationDelay: "0.15s" }}>
          <EventList
            events={events.events}
            onAdd={events.addEvent}
            onDelete={events.deleteEvent}
            timezone={props.timezone}
          />
        </div>

        <div className="reveal" style={{ animationDelay: "0.21s" }}>
          <Notepad
            userId={props.userId}
            today={props.today}
            initialNote={props.initialNote}
          />
        </div>

        <div className="reveal" style={{ animationDelay: "0.27s" }}>
          <WeekHistory
            userId={props.userId}
            currentWeekStart={props.weekStart}
            weekDates={props.weekDates}
            weekFocusByDate={props.weekFocusByDate}
            completedTaskDates={props.completedTaskDates}
            weekHabitsDone={props.weekHabitsDone}
            totalHabitsPerWeek={props.habits.length * 7}
          />
        </div>
      </div>

      {settingsOpen && (
        <SettingsModal
          userId={props.userId}
          habits={props.habits}
          timezone={props.timezone}
          wakeMinute={props.wakeMinute}
          sleepMinute={props.sleepMinute}
          focusGoalMinutes={props.focusGoalMinutes}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <CelebrationToast toasts={celebration.toasts} />
    </main>
  );
}
