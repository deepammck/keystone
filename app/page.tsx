import Link from "next/link";
import { SignInForm } from "@/components/SignInForm";
import { isLocalMode } from "@/lib/local-mode";

// The product triad, telegraphed as pills so the structure reads at a glance.
const PILLARS = ["Tasks", "Focus", "Habits"];

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const local = isLocalMode();
  // The auth callback redirects here with ?error=auth when a magic-link
  // exchange fails — surface it instead of dropping the user on a silent form.
  const { error } = await searchParams;
  return (
    <main className="min-h-dvh flex flex-col items-center justify-start px-6 pt-[16vh] pb-16">
      <div className="reveal w-full max-w-md rounded-3xl border border-border bg-tint px-8 py-12 text-center shadow-[0_30px_80px_-40px_var(--shadow)]">
        <h1 className="font-mono text-5xl font-medium uppercase tracking-[0.06em]">
          Keystone
        </h1>

        <p className="mt-4 text-lg font-medium text-text">
          Tasks, focus, habits. One page.
        </p>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
          Your whole day on a single screen — no tabs, no setup, nothing to
          manage but the work itself.
        </p>

        <div className="mt-5 flex items-center justify-center gap-2">
          {PILLARS.map((p) => (
            <span
              key={p}
              className="rounded-full bg-bg px-3 py-1 text-xs font-medium text-muted"
            >
              {p}
            </span>
          ))}
        </div>

        <div className="mt-8">
          {local ? (
            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="press btn-accent group flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-text font-medium text-bg"
              >
                Open Keystone
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <div className="flex items-center justify-center gap-2 rounded-lg bg-bg px-3 py-2 text-xs text-muted">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="shrink-0 text-accent-soft"
                >
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v14a9 3 0 0 0 18 0V5" />
                  <path d="M3 12a9 3 0 0 0 18 0" />
                </svg>
                Local mode — data is saved to this browser.
              </div>
            </div>
          ) : (
            <>
              {error === "auth" && (
                <p
                  role="alert"
                  className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger"
                >
                  That sign-in link didn’t work — it may have expired. Request a
                  new one below.
                </p>
              )}
              <SignInForm />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
