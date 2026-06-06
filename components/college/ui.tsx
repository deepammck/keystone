"use client";

// Small shared form/display primitives for the College Tracker modules, styled
// with Keystone's design tokens (bg-tint, text-muted, accent, .card, .press).
import { useEffect, useState } from "react";
import { XIcon } from "@/components/icons";

const inputCls =
  "min-h-11 w-full rounded-lg bg-bg px-3 outline-none focus:ring-2 focus:ring-ring";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-lg bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-ring ${props.className ?? ""}`}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} capitalize ${className}`}
    >
      {options.map((o) => (
        <option key={o} value={o} className="capitalize">
          {o}
        </option>
      ))}
    </select>
  );
}

// A styled segmented control for short status pipelines — replaces the native
// <select> on cards so the current stage reads as a labeled pill picker rather
// than an OS dropdown. The active option is filled; the rest are quiet. Wraps
// gracefully on narrow cards.
export function Segmented({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-lg bg-bg p-0.5">
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o)}
            className={`press rounded-md capitalize transition-colors ${
              size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm"
            } ${
              on
                ? "bg-accent font-medium text-on-accent"
                : "text-muted hover:text-text"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// A live constraint counter — "2 of 5", filling to accent once the cap is hit
// so every capped list (honors, recommenders, shortlists) signals its limit the
// same way the dashboard's 5-task cap does.
export function Counter({
  used,
  cap,
  unit,
}: {
  used: number;
  cap: number;
  unit?: string;
}) {
  const reached = used >= cap;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
        reached ? "bg-accent text-on-accent" : "bg-bg text-muted"
      }`}
    >
      {used} of {cap}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card rounded-2xl bg-tint p-4 ${className}`}>{children}</div>
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className={`press btn-accent min-h-11 rounded-lg bg-text px-5 font-medium text-bg disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

export function GhostButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className={`press min-h-11 rounded-lg px-4 text-muted hover:text-text ${props.className ?? ""}`}
    />
  );
}

// Two-step delete: the bare ✕ arms a "Delete?" confirm rather than removing the
// record on first click, so a slip can't wipe a hard-to-rebuild entry. The
// armed state disarms itself after a few seconds. Shared by every module.
export function DeleteButton({
  onClick,
  label = "Delete",
}: {
  onClick: () => void;
  label?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);

  if (armed) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onClick}
          className="press rounded-md bg-danger/15 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/25"
        >
          Delete?
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          aria-label="Keep"
          className="press rounded-md px-1.5 py-1 text-xs text-muted hover:text-text"
        >
          Keep
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setArmed(true)}
      aria-label={label}
      title={label}
      className="press grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted hover:bg-bg hover:text-text"
    >
      <XIcon size={15} />
    </button>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent";
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        tone === "accent" ? "bg-accent text-on-accent" : "bg-bg text-muted"
      }`}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm italic text-muted">{children}</p>;
}

// Live count-vs-limit readout (chars or words). Quiet under ~85% of the limit,
// amber as it nears the cap, accent once it's exceeded — so the constraint that
// defines the "curate" promise is always legible while typing.
export function CharCounter({
  count,
  limit,
  unit = "",
}: {
  count: number;
  limit: number;
  unit?: string;
}) {
  const ratio = limit > 0 ? count / limit : 0;
  const tone =
    ratio > 1
      ? "text-accent font-medium"
      : ratio >= 0.85
        ? "text-warning"
        : "text-muted";
  return (
    <span className={`text-xs tabular-nums ${tone}`}>
      {count} of {limit}
      {unit ? ` ${unit}` : ""}
      {ratio > 1 ? " · over" : ""}
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="section-title font-serif text-xl font-semibold">{children}</h2>
  );
}

// A collapsible "+ Add …" form wrapper: a button that reveals its children
// (the form) and hides again on cancel.
export function AddPanel({
  label,
  children,
  onCancelReset,
}: {
  label: string;
  children: (close: () => void) => React.ReactNode;
  onCancelReset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  function close() {
    setOpen(false);
    onCancelReset?.();
  }
  if (!open) {
    // A full-width dashed add-card, not a quiet text button, so "add" is the
    // clear primary affordance in every module and reads consistently.
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press flex min-h-12 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-tint/40 font-medium text-muted transition-colors hover:border-accent/60 hover:bg-tint hover:text-text"
      >
        <span className="text-lg leading-none">+</span> {label}
      </button>
    );
  }
  return <Card>{children(close)}</Card>;
}
