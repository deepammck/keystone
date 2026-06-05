import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CollegeTool } from "@/components/CollegeTool";
import { LocalCollege } from "@/components/LocalCollege";
import { isLocalMode } from "@/lib/local-mode";
import type {
  CollegeActivity,
  CollegeCourse,
  CollegeHonor,
  CollegeRecommender,
  CollegeSchool,
  CollegeTest,
  EssayDraft,
  EssayPrompt,
  EssayStory,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CollegePage() {
  if (isLocalMode()) return <LocalCollege />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const uid = user.id;
  const byUser = (table: string) =>
    supabase.from(table).select("*").eq("user_id", uid).order("created_at");

  const [
    activities,
    schools,
    prompts,
    stories,
    drafts,
    courses,
    tests,
    honors,
    recommenders,
  ] = await Promise.all([
    byUser("college_activities"),
    byUser("college_schools"),
    byUser("essay_prompts"),
    byUser("essay_stories"),
    byUser("essay_drafts"),
    byUser("college_courses"),
    byUser("college_tests"),
    byUser("college_honors"),
    byUser("college_recommenders"),
  ]);

  return (
    <CollegeTool
      userId={uid}
      data={{
        activities: (activities.data ?? []) as CollegeActivity[],
        schools: (schools.data ?? []) as CollegeSchool[],
        prompts: (prompts.data ?? []) as EssayPrompt[],
        stories: (stories.data ?? []) as EssayStory[],
        drafts: (drafts.data ?? []) as EssayDraft[],
        courses: (courses.data ?? []) as CollegeCourse[],
        tests: (tests.data ?? []) as CollegeTest[],
        honors: (honors.data ?? []) as CollegeHonor[],
        recommenders: (recommenders.data ?? []) as CollegeRecommender[],
      }}
    />
  );
}
