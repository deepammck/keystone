// Preloaded reference data for the College App Tracker, so the tool beats a
// blank spreadsheet from the first open. The official Common App lists live
// here (not in the DB) and are easy to update for a future application cycle.

// ---------------------------------------------------------------------------
// Common App activity categories — fixed dropdown.
// VERIFY for his application year: https://www.commonapp.org/
// ---------------------------------------------------------------------------
export const ACTIVITY_CATEGORIES = [
  "Academic",
  "Art",
  "Athletics: Club",
  "Athletics: JV/Varsity",
  "Career-Oriented",
  "Community Service/Volunteer",
  "Computer/Technology",
  "Cultural",
  "Dance",
  "Debate/Speech",
  "Environmental",
  "Family Responsibilities",
  "Foreign Exchange",
  "Foreign Language",
  "Internship",
  "Journalism/Publication",
  "Junior R.O.T.C.",
  "LGBT",
  "Music: Instrumental",
  "Music: Vocal",
  "Religious",
  "Research",
  "Robotics",
  "School Spirit",
  "Science/Math",
  "Social Justice",
  "Student Govt./Politics",
  "Theater/Drama",
  "Work (Paid)",
  "Other",
] as const;

// ---------------------------------------------------------------------------
// Common App personal-statement prompts. Choose one; 250–650 words.
// These have been verbatim-stable across the 2021-22 → 2026-27 cycles; the set
// below is the 2026-2027 official set. They rotate occasionally, so VERIFY for
// his cycle and edit here: https://www.commonapp.org/apply/essay-prompts/
// ---------------------------------------------------------------------------
export type PersonalPrompt = { id: string; text: string };

export const PERSONAL_STATEMENT_PROMPTS: PersonalPrompt[] = [
  {
    id: "ca-ps-1",
    text: "Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.",
  },
  {
    id: "ca-ps-2",
    text: "The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?",
  },
  {
    id: "ca-ps-3",
    text: "Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?",
  },
  {
    id: "ca-ps-4",
    text: "Reflect on something that someone has done for you that has made you happy or thankful in a surprising way. How has this gratitude affected or motivated you?",
  },
  {
    id: "ca-ps-5",
    text: "Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.",
  },
  {
    id: "ca-ps-6",
    text: "Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you? What or who do you turn to when you want to learn more?",
  },
  {
    id: "ca-ps-7",
    text: "Share an essay on any topic of your choice. It can be one you've already written, one that responds to a different prompt, or one of your own design.",
  },
];

// ---------------------------------------------------------------------------
// Hard limits to enforce / surface in the UI (accurate as of recent cycles;
// historically stable — confirm for his application year).
// ---------------------------------------------------------------------------
export const LIMITS = {
  activitiesShortlist: 10, // Common App slots for the final activities list
  activityDescriptionChars: 150,
  honors: 5,
  personalStatementMinWords: 250,
  personalStatementMaxWords: 650,
} as const;

// ---------------------------------------------------------------------------
// GPA — ported from the original college-tracker prototype.
// ---------------------------------------------------------------------------
export const GPA_SCALE: Record<string, number> = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  D: 1.0,
  F: 0,
};

export const WEIGHT_BONUS: Record<string, number> = {
  Regular: 0,
  Honors: 0.5,
  AP: 1.0,
  IB: 1.0,
  "Dual Enrollment": 1.0,
};

export function calcGPA(
  courses: { grade?: string | null; rigor?: string | null }[],
): { uw: string; w: string } {
  if (!courses.length) return { uw: "—", w: "—" };
  let uwSum = 0;
  let wSum = 0;
  let n = 0;
  for (const c of courses) {
    const base = c.grade ? GPA_SCALE[c.grade] : undefined;
    if (base === undefined) continue;
    uwSum += base;
    wSum += base + (WEIGHT_BONUS[c.rigor ?? "Regular"] ?? 0);
    n++;
  }
  if (!n) return { uw: "—", w: "—" };
  return { uw: (uwSum / n).toFixed(2), w: (wSum / n).toFixed(2) };
}

// Word count for essay drafts (whitespace-delimited).
export function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// ---------------------------------------------------------------------------
// Enum option lists shared by the module forms.
// ---------------------------------------------------------------------------
export const GRADE_LEVELS = ["9", "10", "11", "12"] as const;
export const GRADE_LEVELS_WITH_PG = ["9", "10", "11", "12", "13"] as const; // 13 = post-grad
export const ACTIVITY_TIMING = ["School year", "Break", "Year-round"] as const;
export const ACTIVITY_STATUS = ["active", "ended"] as const;

export const SCHOOL_TAGS = ["reach", "target", "safety"] as const;
export const SCHOOL_STATUSES = [
  "interested",
  "researching",
  "visited",
  "applying",
  "applied",
] as const;
export const APP_PLATFORMS = ["Common App", "Coalition", "Direct"] as const;
export const DEADLINE_TYPES = ["EA", "ED", "REA", "RD", "Rolling"] as const;
export const TEST_POLICIES = ["required", "optional", "blind"] as const;

export const ESSAY_PROMPT_SCOPES = ["supplemental", "practice"] as const;
export const DRAFT_STATUSES = [
  "brainstorm",
  "outlining",
  "drafting",
  "revising",
  "done",
] as const;
export const STORY_TAG_SUGGESTIONS = [
  "leadership",
  "failure",
  "identity",
  "intellectual curiosity",
  "community",
  "challenge",
  "growth",
  "service",
] as const;

export const COURSE_RIGOR = [
  "AP",
  "IB",
  "Honors",
  "Dual Enrollment",
  "Regular",
] as const;
export const COURSE_TERMS = ["Full year", "Fall", "Spring", "Q1", "Q2", "Q3", "Q4"] as const;

export const TEST_KINDS = ["SAT", "ACT", "AP", "Other"] as const;
export const TEST_STATUSES = ["planned", "taken"] as const;

export const HONOR_LEVELS = ["school", "state", "national", "international"] as const;
export const RECOMMENDER_STATUSES = [
  "considering",
  "asked",
  "agreed",
  "submitted",
] as const;
