export type Task = {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  date: string | null; // null = unscheduled inbox/backlog item
  position: number;
  created_at: string;
};

export type Event = {
  id: string;
  user_id: string;
  title: string;
  due_at: string;
  created_at: string;
};

export type FocusSession = {
  id: string;
  user_id: string;
  started_at: string;
  duration_seconds: number;
  label: string | null;
  date: string;
  created_at: string;
};

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  position: number;
  active: boolean;
  created_at: string;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  completed: boolean;
};

export type Profile = {
  id: string;
  timezone: string;
  timer_started_at: string | null;
  timer_label: string | null;
  wake_minute: number;
  sleep_minute: number;
  focus_goal_minutes: number;
  theme: string;
  created_at: string;
};

export type DailyNote = {
  id: string;
  user_id: string;
  date: string;
  content: string | null;
  created_at: string;
  updated_at: string;
};
