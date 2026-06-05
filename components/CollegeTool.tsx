"use client";

import { Fragment, useState } from "react";
import type { CollegeData } from "@/lib/types";
import { AppSwitcher } from "@/components/AppSwitcher";
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

  return (
    <main className="relative z-10 mx-auto flex max-w-[880px] flex-col gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6">
      <div className="reveal">
        <AppSwitcher userId={userId} />
        <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
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
                onClick={() => setTab(t)}
                aria-current={tab === t ? "page" : undefined}
                className={`press shrink-0 border-b-[3px] px-3 py-2.5 transition-colors ${
                  tab === t
                    ? "border-accent text-[15px] font-semibold text-text"
                    : "border-transparent text-sm font-medium text-muted hover:text-text"
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
        {tab === "Overview" && <Overview data={data} onNavigate={setTab} />}
        {tab === "Activities" && (
          <ActivitiesModule initial={data.activities} userId={userId} />
        )}
        {tab === "Schools" && (
          <SchoolsModule initial={data.schools} userId={userId} />
        )}
        {tab === "Essays" && (
          <EssaysModule
            initialPrompts={data.prompts}
            initialStories={data.stories}
            initialDrafts={data.drafts}
            schools={data.schools}
            userId={userId}
          />
        )}
        {tab === "Academics" && (
          <AcademicsModule initial={data.courses} userId={userId} />
        )}
        {tab === "Testing" && (
          <TestingModule initial={data.tests} userId={userId} />
        )}
        {tab === "Honors" && (
          <HonorsModule initial={data.honors} userId={userId} />
        )}
        {tab === "Recommenders" && (
          <RecommendersModule initial={data.recommenders} userId={userId} />
        )}
      </div>
    </main>
  );
}
