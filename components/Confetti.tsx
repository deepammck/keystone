"use client";

import { useState } from "react";

const COUNT = 14;
const COLORS = [
  "var(--accent)",
  "color-mix(in oklab, var(--accent) 60%, white)",
  "color-mix(in oklab, var(--accent) 70%, var(--text))",
];

// Pure-CSS confetti for the perfect-day finale. No library. Pieces are seeded
// once on mount with randomized horizontal position, drift, delay and color,
// then the CSS `confetti-fall` keyframe (in globals.css) animates them down.
// Under prefers-reduced-motion the keyframe is disabled, so this stays silent.
export function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      key: i,
      left: Math.random() * 100,
      drift: `${(Math.random() - 0.5) * 240}px`,
      delay: Math.random() * 0.25,
      color: COLORS[i % COLORS.length],
    })),
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={p.key}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            ["--drift" as string]: p.drift,
          }}
        />
      ))}
    </div>
  );
}
