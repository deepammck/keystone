"use client";

import { Fragment, useEffect, useState } from "react";
import type {
  CollegeActivity,
  CollegeCourse,
  CollegeData,
  CollegeHonor,
  CollegeRecommender,
  CollegeSchool,
  CollegeTest,
  EssayDraft,
  EssayPrompt,
  EssayStory,
} from "@/lib/types";
import { useCollection } from "@/lib/hooks/useCollection";
import { useOnline } from "@/lib/hooks/useOnline";
import { AppSwitcher } from "@/components/AppSwitcher";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { Overview } from "@/components/college/Overview";
import { ActivitiesModule } from "@/components/college/ActivitiesModule";
import { SchoolsModule } from "@/components/college/SchoolsModule";
import { EssaysModule } from "@/components/college/EssaysModule";
import { AcademicsModule } from "@/components/college/AcademicsModule";
import { TestingModule } from "@/components/college/TestingModule";
import { HonorsModule } from "@/components/college/HonorsModule";
import { RecommendersModule } from "@/components/college/RecommendersModule";

// The College tool's OWN internal sub-tabs (under /college) — not top-level nav.
const TABS = [
  "Overview",
  "Activities",
  "Schools",
  "Essays",
  "Academics",
  "Testing",
  "Honors",
  "Recommenders",
] as const;

export function CollegeTool({
  userId,
  data,
}: {
  userId: string;
  data: CollegeData;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  // Restore the last-viewed sub-tab so reopening the tool lands where you left
  // off — same pattern (and same reasoning) as the Essays inner view. Loaded in
  // an effect, not render, to avoid a hydration mismatch with the SSR default.
  useEffect(() => {
    const saved = localStorage.getItem("keystone:college-tab");
    if (saved && (TABS as readonly string[]).includes(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(saved as (typeof TABS)[number]);
    }
  }, []);
  // After a restore (or any change), make sure the active tab isn't hidden in
  // the horizontal scroller's overflow on narrow screens.
  useEffect(() => {
    document
      .querySelector('[aria-current="page"][data-college-tab]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);
  function selectTab(t: (typeof TABS)[number]) {
    setTab(t);
    try {
      localStorage.setItem("keystone:college-tab", t);
    } catch {}
  }
  // Mounted here (not only on the Keystone/Links pages) so queued offline
  // writes flush while the College tool is open, and the user sees the
  // offline banner instead of silently-parked edits.
  const online = useOnline();

  // All nine collections live HERE, not inside the tab modules. Modules
  // unmount on every tab switch — if they owned their own useCollection state,
  // each remount would re-seed from the page-load snapshot and edits made
  // earlier in the session would visually vanish (and Overview would never
  // update at all).
  const activities = useCollection<CollegeActivity>(
    "college_activities",
    data.activities,
    userId,
  );
  const schools = useCollection<CollegeSchool>(
    "college_schools",
    data.schools,
    userId,
  );
  const prompts = useCollection<EssayPrompt>(
    "essay_prompts",
    data.prompts,
    userId,
  );
  const stories = useCollection<EssayStory>(
    "essay_stories",
    data.stories,
    userId,
  );
  const drafts = useCollection<EssayDraft>("essay_drafts", data.drafts, userId);
  const courses = useCollection<CollegeCourse>(
    "college_courses",
    data.courses,
    userId,
  );
  const tests = useCollection<CollegeTest>("college_tests", data.tests, userId);
  const honors = useCollection<CollegeHonor>(
    "college_honors",
    data.honors,
    userId,
  );
  const recommenders = useCollection<CollegeRecommender>(
    "college_recommenders",
    data.recommenders,
    userId,
  );

  // Live snapshot for the Overview dashboard — always reflects this session's
  // edits, unlike the SSR `data` prop.
  const live: CollegeData = {
    activities: activities.items,
    schools: schools.items,
    prompts: prompts.items,
    stories: stories.items,
    drafts: drafts.items,
    courses: courses.items,
    tests: tests.items,
    honors: honors.items,
    recommenders: recommenders.items,
  };

  return (
    <>
      <AppSwitcher userId={userId} />
      <main className="relative z-10 mx-auto flex max-w-[880px] flex-col gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6">
      <div className="reveal">
        <OfflineIndicator online={online} />
        <h1 className="mt-1 font-mono text-3xl font-medium uppercase leading-tight tracking-[0.04em] sm:text-4xl">
          College Tracker
        </h1>
        <p className="mt-1.5 text-[13px] text-muted">
          An accumulation tool — log everything now, curate senior year.
        </p>
      </div>

      {/* Internal sub-tabs. A divider after Overview separates the dashboard
          from the working tabs; the right-edge fade signals horizontal overflow
          on narrow screens (where the eight tabs scroll). */}
      <div className="reveal relative">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t, i) => (
            <Fragment key={t}>
              {i === 1 && (
                <span
                  aria-hidden
                  className="mx-1 h-5 w-px shrink-0 self-center bg-border"
                />
              )}
              <button
                type="button"
                data-college-tab
                onClick={() => selectTab(t)}
                aria-current={tab === t ? "page" : undefined}
                className={`press shrink-0 border-b-[3px] px-3 py-3 text-sm transition-colors ${
                  tab === t
                    ? "border-accent font-semibold text-text"
                    : "border-transparent font-medium text-muted hover:text-text"
                }`}
              >
                {t}
              </button>
            </Fragment>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-10 bg-gradient-to-l from-bg to-transparent sm:hidden" />
      </div>

      <div className="reveal" style={{ animationDelay: "0.06s" }}>
        {tab === "Overview" && <Overview data={live} onNavigate={setTab} />}
        {tab === "Activities" && <ActivitiesModule collection={activities} />}
        {tab === "Schools" && <SchoolsModule collection={schools} />}
        {tab === "Essays" && (
          <EssaysModule
            prompts={prompts}
            stories={stories}
            drafts={drafts}
            schools={schools.items}
          />
        )}
        {tab === "Academics" && <AcademicsModule collection={courses} />}
        {tab === "Testing" && <TestingModule collection={tests} />}
        {tab === "Honors" && <HonorsModule collection={honors} />}
        {tab === "Recommenders" && (
          <RecommendersModule collection={recommenders} />
        )}
      </div>
    </main>
    </>
  );
}
