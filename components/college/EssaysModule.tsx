"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EssayDraft,
  EssayPrompt,
  EssayStory,
  CollegeSchool,
} from "@/lib/types";
import { useCollection } from "@/lib/hooks/useCollection";
import {
  PERSONAL_STATEMENT_PROMPTS,
  ESSAY_PROMPT_SCOPES,
  DRAFT_STATUSES,
  STORY_TAG_SUGGESTIONS,
  LIMITS,
  wordCount,
} from "@/lib/college-reference";
import {
  AddPanel,
  Badge,
  Card,
  CharCounter,
  DeleteButton,
  Empty,
  Field,
  GhostButton,
  Input,
  PrimaryButton,
  Row,
  Segmented,
  Select,
  Textarea,
} from "@/components/college/ui";

type PromptOption = {
  id: string;
  label: string;
  kind: string;
  limit: number | null;
  schoolId?: string | null;
};

const SUBTABS = ["Prompts", "Stories", "Drafts", "Reuse"] as const;

export function EssaysModule({
  initialPrompts,
  initialStories,
  initialDrafts,
  schools,
  userId,
}: {
  initialPrompts: EssayPrompt[];
  initialStories: EssayStory[];
  initialDrafts: EssayDraft[];
  schools: CollegeSchool[];
  userId: string;
}) {
  const prompts = useCollection<EssayPrompt>("essay_prompts", initialPrompts, userId);
  const stories = useCollection<EssayStory>("essay_stories", initialStories, userId);
  const drafts = useCollection<EssayDraft>("essay_drafts", initialDrafts, userId);
  const [sub, setSub] = useState<(typeof SUBTABS)[number]>("Prompts");

  // Persist the last-used inner view so returning to Essays lands where you
  // left off. Loaded in an effect (not in render) to avoid a hydration
  // mismatch with the SSR default.
  useEffect(() => {
    const saved = localStorage.getItem("keystone:essays-subtab");
    if (saved && (SUBTABS as readonly string[]).includes(saved)) {
      // Client-only restore after hydration; intentional one-shot setState.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSub(saved as (typeof SUBTABS)[number]);
    }
  }, []);
  function selectSub(t: (typeof SUBTABS)[number]) {
    setSub(t);
    try {
      localStorage.setItem("keystone:essays-subtab", t);
    } catch {}
  }

  const schoolName = (id: string | null | undefined) =>
    id ? (schools.find((s) => s.id === id)?.name ?? "—") : null;

  // Combined prompt list (official personal statements + user-added) for links,
  // labels and word limits.
  const promptOptions: PromptOption[] = useMemo(
    () => [
      ...PERSONAL_STATEMENT_PROMPTS.map((p) => ({
        id: p.id,
        label: p.text,
        kind: "personal",
        limit: LIMITS.personalStatementMaxWords,
      })),
      ...prompts.items.map((p) => ({
        id: p.id,
        label: p.text,
        kind: p.scope,
        limit: p.word_limit,
        schoolId: p.school_id,
      })),
    ],
    [prompts.items],
  );
  const promptById = (id: string | null | undefined) =>
    promptOptions.find((p) => p.id === id);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        A material bank first, a draft editor second — collect stories now so you
        aren’t staring at a blank page senior fall.
      </p>

      {/* A contained segmented bar so this inner view switcher reads as nested
          controls, distinct from the underline sub-tabs above it. */}
      <div className="inline-flex w-full gap-0.5 rounded-xl bg-tint p-1 sm:w-auto sm:self-start">
        {SUBTABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => selectSub(t)}
            aria-pressed={sub === t}
            className={`press flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
              sub === t
                ? "bg-accent text-on-accent shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {sub === "Prompts" && (
        <PromptsView
          prompts={prompts}
          stories={stories.items}
          drafts={drafts.items}
          schools={schools}
          schoolName={schoolName}
        />
      )}
      {sub === "Stories" && (
        <StoriesView stories={stories} promptOptions={promptOptions} />
      )}
      {sub === "Drafts" && (
        <DraftsView
          drafts={drafts}
          promptOptions={promptOptions}
          promptById={promptById}
          schools={schools}
          schoolName={schoolName}
        />
      )}
      {sub === "Reuse" && (
        <ReuseView prompts={prompts.items} schoolName={schoolName} />
      )}
    </div>
  );
}

// --- 3a. Prompts -------------------------------------------------------------
function PromptsView({
  prompts,
  stories,
  drafts,
  schools,
  schoolName,
}: {
  prompts: ReturnType<typeof useCollection<EssayPrompt>>;
  stories: EssayStory[];
  drafts: EssayDraft[];
  schools: CollegeSchool[];
  schoolName: (id: string | null | undefined) => string | null;
}) {
  const [form, setForm] = useState({
    scope: ESSAY_PROMPT_SCOPES[0] as string,
    school_id: "",
    text: "",
    word_limit: "",
  });

  async function submit(close: () => void) {
    if (!form.text.trim()) return;
    await prompts.add({
      scope: form.scope,
      school_id: form.school_id || null,
      text: form.text.trim(),
      word_limit: form.word_limit ? Number(form.word_limit) : null,
    });
    setForm({ scope: form.scope, school_id: "", text: "", word_limit: "" });
    close();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-2 text-sm font-semibold">
          Common App personal statement{" "}
          <span className="font-normal text-muted">
            — choose one, {LIMITS.personalStatementMinWords}–
            {LIMITS.personalStatementMaxWords} words
          </span>
        </div>
        <ol className="flex flex-col gap-2">
          {PERSONAL_STATEMENT_PROMPTS.map((p, i) => (
            <li key={p.id} className="flex gap-2 text-sm">
              <span className="tabular-nums text-muted">{i + 1}.</span>
              <span className="text-muted">{p.text}</span>
            </li>
          ))}
        </ol>
      </Card>

      <AddPanel label="Add supplemental / practice prompt">
        {(close) => (
          <div className="flex flex-col gap-3">
            <Row>
              <Field label="Scope">
                <Select
                  value={form.scope}
                  onChange={(v) => setForm({ ...form, scope: v })}
                  options={ESSAY_PROMPT_SCOPES}
                />
              </Field>
              <Field label="School (optional)">
                <select
                  value={form.school_id}
                  onChange={(e) =>
                    setForm({ ...form, school_id: e.target.value })
                  }
                  className="min-h-11 w-full rounded-lg bg-bg px-3 outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">—</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Word limit">
                <Input
                  type="number"
                  value={form.word_limit}
                  onChange={(e) =>
                    setForm({ ...form, word_limit: e.target.value })
                  }
                  placeholder="e.g. 250"
                />
              </Field>
            </Row>
            <Field label="Prompt text">
              <Textarea
                rows={2}
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder="Why us? / Describe a community you belong to…"
              />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="button" onClick={() => submit(close)}>
                Add
              </PrimaryButton>
              <GhostButton type="button" onClick={close}>
                Cancel
              </GhostButton>
            </div>
          </div>
        )}
      </AddPanel>

      {prompts.items.length === 0 ? (
        <Empty>No supplemental prompts yet — add them as you find them.</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {prompts.items.map((p) => {
            // Coverage: how many drafts answer this prompt, and whether any
            // banked story is linked to it — so gaps are visible at a glance.
            const draftCount = drafts.filter((d) => d.prompt_ref === p.id).length;
            const storyCount = stories.filter((s) =>
              s.prompt_ids.includes(p.id),
            ).length;
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">{p.text}</p>
                  <DeleteButton onClick={() => prompts.remove(p.id)} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Badge>{p.scope}</Badge>
                  {p.school_id && <span>{schoolName(p.school_id)}</span>}
                  {p.word_limit != null && <span>{p.word_limit} words</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      draftCount > 0
                        ? "bg-accent/15 text-accent-soft"
                        : "bg-bg text-muted"
                    }`}
                  >
                    {draftCount} draft{draftCount === 1 ? "" : "s"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      storyCount > 0
                        ? "bg-accent/15 text-accent-soft"
                        : "bg-bg text-muted"
                    }`}
                  >
                    {storyCount > 0
                      ? `${storyCount} story link${storyCount === 1 ? "" : "s"}`
                      : "no story yet"}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- 3b. Stories (material bank) --------------------------------------------
function StoriesView({
  stories,
  promptOptions,
}: {
  stories: ReturnType<typeof useCollection<EssayStory>>;
  promptOptions: PromptOption[];
}) {
  const [form, setForm] = useState({ title: "", body: "", tags: "" });

  async function submit(close: () => void) {
    if (!form.title.trim()) return;
    await stories.add({
      title: form.title.trim(),
      body: form.body.trim() || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      prompt_ids: [],
    });
    setForm({ title: "", body: "", tags: "" });
    close();
  }

  return (
    <div className="flex flex-col gap-4">
      <AddPanel label="Add story / anecdote">
        {(close) => (
          <div className="flex flex-col gap-3">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="The summer the lake dried up"
                autoFocus
              />
            </Field>
            <Field label="The story / notes">
              <Textarea
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </Field>
            <Field label="Theme tags (comma separated)">
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder={STORY_TAG_SUGGESTIONS.slice(0, 4).join(", ")}
              />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="button" onClick={() => submit(close)}>
                Add
              </PrimaryButton>
              <GhostButton type="button" onClick={close}>
                Cancel
              </GhostButton>
            </div>
          </div>
        )}
      </AddPanel>

      {stories.items.length === 0 ? (
        <Empty>No stories banked yet — this is the whole point of starting early.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {stories.items.map((s) => (
            <StoryCard
              key={s.id}
              story={s}
              promptOptions={promptOptions}
              onUpdate={(patch) => stories.update(s.id, patch)}
              onDelete={() => stories.remove(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StoryCard({
  story,
  promptOptions,
  onUpdate,
  onDelete,
}: {
  story: EssayStory;
  promptOptions: PromptOption[];
  onUpdate: (patch: Partial<EssayStory>) => void;
  onDelete: () => void;
}) {
  const [linking, setLinking] = useState(false);
  const shortLabel = (label: string) =>
    label.length > 60 ? label.slice(0, 57) + "…" : label;

  function toggle(id: string) {
    const next = story.prompt_ids.includes(id)
      ? story.prompt_ids.filter((x) => x !== id)
      : [...story.prompt_ids, id];
    onUpdate({ prompt_ids: next });
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">{story.title}</div>
        <DeleteButton onClick={onDelete} />
      </div>
      {story.body && (
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-snug text-muted">
          {story.body}
        </p>
      )}
      {story.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {story.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      )}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setLinking((v) => !v)}
          className="press text-xs text-muted underline-offset-2 hover:underline"
        >
          {story.prompt_ids.length > 0
            ? `Answers ${story.prompt_ids.length} prompt(s)`
            : "Link to prompts"}
        </button>
        {linking && (
          <div className="mt-2 flex max-h-48 flex-col gap-1 overflow-auto rounded-lg bg-bg p-2">
            {promptOptions.map((p) => (
              <label key={p.id} className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={story.prompt_ids.includes(p.id)}
                  onChange={() => toggle(p.id)}
                />
                <span className="text-muted">{shortLabel(p.label)}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// --- 3c. Drafts --------------------------------------------------------------
function DraftsView({
  drafts,
  promptOptions,
  promptById,
  schools,
  schoolName,
}: {
  drafts: ReturnType<typeof useCollection<EssayDraft>>;
  promptOptions: PromptOption[];
  promptById: (id: string | null | undefined) => PromptOption | undefined;
  schools: CollegeSchool[];
  schoolName: (id: string | null | undefined) => string | null;
}) {
  const [form, setForm] = useState({
    prompt_ref: PERSONAL_STATEMENT_PROMPTS[0].id,
    school_id: "",
    title: "",
  });

  async function submit(close: () => void) {
    await drafts.add({
      prompt_ref: form.prompt_ref || null,
      school_id: form.school_id || null,
      title: form.title.trim() || null,
      body: "",
      status: DRAFT_STATUSES[0],
      group_id: crypto.randomUUID(),
      version: 1,
    });
    setForm({ prompt_ref: PERSONAL_STATEMENT_PROMPTS[0].id, school_id: "", title: "" });
    close();
  }

  // Group versions: show the latest version per group_id, with a count.
  const groups = useMemo(() => {
    const byGroup = new Map<string, EssayDraft[]>();
    for (const d of drafts.items) {
      const arr = byGroup.get(d.group_id) ?? [];
      arr.push(d);
      byGroup.set(d.group_id, arr);
    }
    return [...byGroup.values()].map((versions) => {
      const sorted = [...versions].sort((a, b) => b.version - a.version);
      return { latest: sorted[0], count: versions.length, versions: sorted };
    });
  }, [drafts.items]);

  return (
    <div className="flex flex-col gap-4">
      <AddPanel label="Start a draft">
        {(close) => (
          <div className="flex flex-col gap-3">
            <Field label="Prompt">
              <select
                value={form.prompt_ref}
                onChange={(e) =>
                  setForm({ ...form, prompt_ref: e.target.value })
                }
                className="min-h-11 w-full rounded-lg bg-bg px-3 outline-none focus:ring-2 focus:ring-accent"
              >
                {promptOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label.length > 70 ? p.label.slice(0, 67) + "…" : p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Row>
              <Field label="School (optional)">
                <select
                  value={form.school_id}
                  onChange={(e) =>
                    setForm({ ...form, school_id: e.target.value })
                  }
                  className="min-h-11 w-full rounded-lg bg-bg px-3 outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">—</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title (optional)">
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
            </Row>
            <div className="flex gap-2">
              <PrimaryButton type="button" onClick={() => submit(close)}>
                Start
              </PrimaryButton>
              <GhostButton type="button" onClick={close}>
                Cancel
              </GhostButton>
            </div>
          </div>
        )}
      </AddPanel>

      {groups.length === 0 ? (
        <Empty>No drafts yet.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(({ latest, count, versions }) => (
            <DraftCard
              key={latest.group_id}
              draft={latest}
              versionCount={count}
              versions={versions}
              limit={promptById(latest.prompt_ref)?.limit ?? null}
              promptLabel={promptById(latest.prompt_ref)?.label ?? "—"}
              school={schoolName(latest.school_id)}
              onUpdate={(patch) => drafts.update(latest.id, patch)}
              onNewVersion={() =>
                drafts.add({
                  prompt_ref: latest.prompt_ref,
                  school_id: latest.school_id,
                  title: latest.title,
                  body: latest.body,
                  status: latest.status,
                  group_id: latest.group_id,
                  version: latest.version + 1,
                })
              }
              onDelete={() => drafts.remove(latest.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DraftCard({
  draft,
  versionCount,
  versions,
  limit,
  promptLabel,
  school,
  onUpdate,
  onNewVersion,
  onDelete,
}: {
  draft: EssayDraft;
  versionCount: number;
  versions: EssayDraft[];
  limit: number | null;
  promptLabel: string;
  school: string | null;
  onUpdate: (patch: Partial<EssayDraft>) => void;
  onNewVersion: () => void;
  onDelete: () => void;
}) {
  const [body, setBody] = useState(draft.body ?? "");
  const [showHistory, setShowHistory] = useState(false);
  const words = wordCount(body);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{draft.title || "Untitled draft"}</div>
          <div className="truncate text-xs text-muted">
            {promptLabel.length > 80
              ? promptLabel.slice(0, 77) + "…"
              : promptLabel}
            {school ? ` · ${school}` : ""}
          </div>
        </div>
        <DeleteButton onClick={onDelete} />
      </div>

      {/* Stage reads as a labelled progress picker, not a hidden dropdown. */}
      <div className="mt-2.5">
        <Segmented
          value={draft.status}
          onChange={(v) => onUpdate({ status: v })}
          options={DRAFT_STATUSES}
          size="sm"
        />
      </div>

      <textarea
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => body !== (draft.body ?? "") && onUpdate({ body })}
        placeholder="Write here…"
        className="mx-auto mt-3 w-full max-w-prose resize-y rounded-lg bg-bg px-4 py-3 text-sm leading-7 outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={onNewVersion}
          className="press text-muted underline-offset-2 hover:underline"
        >
          Save as new version
        </button>
        {limit != null ? (
          <CharCounter count={words} limit={limit} unit="words" />
        ) : (
          <span className="tabular-nums text-muted">{words} words</span>
        )}
      </div>

      {/* Version history made legible: a stepper of every saved iteration. */}
      {versionCount > 1 && (
        <div className="mt-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
            className="press flex items-center gap-1 text-xs font-medium text-muted hover:text-text"
          >
            <span
              className={`transition-transform duration-200 ${showHistory ? "rotate-90" : ""}`}
              aria-hidden
            >
              ▸
            </span>
            v{draft.version} of {versionCount} · version history
          </button>
          {showHistory && (
            <ul className="mt-2 flex flex-col gap-1">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-bg px-2.5 py-1.5 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">v{v.version}</span>
                    {v.id === draft.id && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-on-accent">
                        current
                      </span>
                    )}
                    <span className="capitalize text-muted">{v.status}</span>
                  </span>
                  <span className="tabular-nums text-muted">
                    {wordCount(v.body)} words
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

// --- 3d. Reuse view ----------------------------------------------------------
function ReuseView({
  prompts,
  schoolName,
}: {
  prompts: EssayPrompt[];
  schoolName: (id: string | null | undefined) => string | null;
}) {
  // Group supplemental prompts by normalized text; surface those used by >1
  // school so one essay can be adapted across several.
  const groups = useMemo(() => {
    const byText = new Map<string, { text: string; schools: Set<string> }>();
    for (const p of prompts) {
      if (p.scope !== "supplemental") continue;
      const key = p.text.trim().toLowerCase();
      const entry = byText.get(key) ?? { text: p.text.trim(), schools: new Set() };
      const name = schoolName(p.school_id);
      if (name) entry.schools.add(name);
      byText.set(key, entry);
    }
    return [...byText.values()]
      .filter((g) => g.schools.size > 1)
      .sort((a, b) => b.schools.size - a.schools.size);
  }, [prompts, schoolName]);

  if (groups.length === 0) {
    return (
      <Empty>
        No overlap yet. Once the same supplemental prompt (e.g. “Why us?”) shows
        up at multiple schools, it’ll appear here so you can reuse one essay.
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g, i) => (
        <Card key={i}>
          <p className="text-sm">{g.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">Reusable across:</span>
            {[...g.schools].map((s) => (
              <Badge key={s} tone="accent">
                {s}
              </Badge>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
