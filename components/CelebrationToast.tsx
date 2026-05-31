"use client";

import type { Toast } from "@/lib/hooks/useCelebrations";
import { Confetti } from "@/components/Confetti";

type Props = {
  toasts: Toast[];
};

// Transient popup notifications for completion rewards, stacked near the top of
// the screen. Confetti accompanies the rare "perfect day" toast.
export function CelebrationToast({ toasts }: Props) {
  if (toasts.length === 0) return null;

  return (
    <>
      {toasts.some((t) => t.perfect) && <Confetti />}
      <div
        className="pointer-events-none fixed z-50 flex flex-col items-end gap-2"
        style={{
          top: "calc(env(safe-area-inset-top) + 1rem)",
          right: "calc(env(safe-area-inset-right) + 1rem)",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-enter rounded-2xl border border-border bg-bg px-5 py-2.5 shadow"
          >
            <p className="font-serif text-sm italic text-accent">{t.message}</p>
          </div>
        ))}
      </div>
    </>
  );
}
