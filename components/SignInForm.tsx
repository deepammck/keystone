"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const [email, setEmail] = useState("");
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

  // Dev-only: skip the email round-trip by signing in with a seeded password
  // account. Dead-code-eliminated in production builds.
  const devBypass = process.env.NODE_ENV !== "production";

  async function bypassSignIn() {
    setStatus("sending");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: process.env.NEXT_PUBLIC_DEV_EMAIL ?? "",
      password: process.env.NEXT_PUBLIC_DEV_PASSWORD ?? "",
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      window.location.href = "/dashboard";
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-text">
        Check your email — we sent a sign-in link to{" "}
        <span className="font-medium">{email}</span>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={sendLink} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="min-h-11 rounded-lg bg-bg px-4 text-center text-text outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="min-h-11 rounded-lg bg-text font-medium text-bg transition-opacity disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send link"}
        </button>
      </form>

      {devBypass && (
        <button
          type="button"
          onClick={bypassSignIn}
          disabled={status === "sending"}
          className="min-h-11 rounded-lg border border-dashed border-muted/50 text-sm text-muted transition-opacity disabled:opacity-50"
        >
          Dev bypass (skip email)
        </button>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
