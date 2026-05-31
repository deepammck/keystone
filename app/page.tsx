import Link from "next/link";
import { SignInForm } from "@/components/SignInForm";
import { isLocalMode } from "@/lib/local-mode";

export default function Landing() {
  const local = isLocalMode();
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-tint px-8 py-12 text-center">
        <h1 className="font-serif text-5xl font-semibold tracking-tight">
          Keystone
        </h1>
        <p className="mt-3 text-sm text-muted">
          Tasks, focus, habits. One page.
        </p>
        <div className="mt-8">
          {local ? (
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="flex min-h-11 items-center justify-center rounded-lg bg-text font-medium text-bg"
              >
                Open Keystone
              </Link>
              <p className="text-xs text-muted">
                Local mode — data is saved to this browser.
              </p>
            </div>
          ) : (
            <SignInForm />
          )}
        </div>
      </div>
    </main>
  );
}
