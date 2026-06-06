"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  // Optional password sign-in for a fixed account (skips the email round-trip).
  // Gated on a build-time flag so it can be toggled on in production, and the
  // password is typed — never embedded in the client bundle. Kept out of the
  // main card as a discreet corner popover so it doesn't compete with the email
  // flow.
  const passwordLogin = process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === "true";

  async function passwordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: process.env.NEXT_PUBLIC_DEV_EMAIL ?? "",
      password,
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      window.location.href = "/dashboard";
    }
  }

  const cornerPopover = passwordLogin && (
    <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-2">
      {showPassword && (
        <form
          onSubmit={passwordSignIn}
          className="flex w-52 flex-col gap-2 rounded-xl bg-tint p-3 shadow-lg ring-1 ring-black/20"
        >
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="min-h-9 rounded-lg bg-bg px-3 text-sm text-text outline-none placeholder:text-muted focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="min-h-9 rounded-lg bg-text text-sm font-medium text-bg transition-opacity disabled:opacity-50"
          >
            {status === "sending" ? "Signing in…" : "Sign in"}
          </button>
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
        </form>
      )}
      <button
        type="button"
        aria-label="Password sign-in"
        onClick={() => setShowPassword((v) => !v)}
        className="flex size-7 items-center justify-center rounded-full text-muted/60 transition-colors hover:text-muted focus-visible:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
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
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </button>
    </div>
  );

  if (status === "sent") {
    return (
      <>
        <p className="text-sm text-text">
          Check your email — we sent a sign-in link to{" "}
          <span className="font-medium">{email}</span>.
        </p>
        {cornerPopover}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <form onSubmit={sendLink} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            aria-label="Email address"
            className="min-h-11 rounded-lg bg-bg px-4 text-center text-text outline-none placeholder:text-muted focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="min-h-11 rounded-lg bg-text font-medium text-bg transition-opacity disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Send link"}
          </button>
        </form>

        {error && !showPassword && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      {cornerPopover}
    </>
  );
}
