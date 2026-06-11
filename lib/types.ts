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

// A "thing I want to achieve" — an always-visible aspiration. Rendered as pills
// in the Header's GoalBanner (NOT a new section, NOT a checklist); driven by the
// generic useCollection hook. `completed` is retained but unused (goals here are
// read, not ticked off).
export type Goal = {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
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
  last_app: string;
  created_at: string;
};

export type Link = {
  id: string;
  user_id: string;
  url: string;
  note: string;
  title: string | null;
  summary: string | null;
  tags: string[];
  created_at: string;
};

// --- College App Tracker -----------------------------------------------------

export type CollegeActivity = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  role: string | null;
  organization: string | null;
  description: string | null;
  ca_description: string | null;
  grades: number[];
  timing: string | null;
  hours_per_week: number | null;
  weeks_per_year: number | null;
  status: string;
  continue_in_college: boolean;
  ca_candidate: boolean;
  ca_rank: number | null;
  notes: string | null;
  position: number;
  created_at: string;
};

export type CollegeSchool = {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  tag: string | null;
  status: string;
  platform: string | null;
  deadline_type: string | null;
  deadline_date: string | null;
  app_fee: number | null;
  fee_waiver: boolean;
  test_policy: string | null;
  supplements_count: number;
  acceptance_rate: string | null;
  fit_notes: string | null;
  notes: string | null;
  created_at: string;
};

export type EssayPrompt = {
  id: string;
  user_id: string;
  scope: string;
  school_id: string | null;
  text: string;
  word_limit: number | null;
  created_at: string;
};

export type EssayStory = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  tags: string[];
  prompt_ids: string[];
  created_at: string;
};

export type EssayDraft = {
  id: string;
  user_id: string;
  prompt_ref: string | null;
  school_id: string | null;
  title: string | null;
  body: string | null;
  status: string;
  group_id: string;
  version: number;
  created_at: string;
};

export type CollegeCourse = {
  id: string;
  user_id: string;
  grade_level: string | null;
  term: string | null;
  name: string;
  rigor: string;
  grade: string | null;
  planned: boolean;
  created_at: string;
};

export type CollegeTest = {
  id: string;
  user_id: string;
  kind: string;
  label: string | null;
  test_date: string | null;
  status: string;
  score: number | null;
  goal: number | null;
  subscores: Record<string, number>;
  notes: string | null;
  created_at: string;
};

export type CollegeHonor = {
  id: string;
  user_id: string;
  title: string;
  level: string | null;
  grade: string | null;
  position: number;
  created_at: string;
};

export type CollegeRecommender = {
  id: string;
  user_id: string;
  name: string;
  subject: string | null;
  why_fit: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

// All college tables bundled for SSR/local initial-load.
export type CollegeData = {
  activities: CollegeActivity[];
  schools: CollegeSchool[];
  prompts: EssayPrompt[];
  stories: EssayStory[];
  drafts: EssayDraft[];
  courses: CollegeCourse[];
  tests: CollegeTest[];
  honors: CollegeHonor[];
  recommenders: CollegeRecommender[];
};

export type DailyNote = {
  id: string;
  user_id: string;
  date: string;
  content: string | null;
  created_at: string;
  updated_at: string;
};
