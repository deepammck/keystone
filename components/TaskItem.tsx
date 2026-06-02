"use client";

import { useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/types";

type Props = {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onMoveToToday?: () => void;
};

export function TaskItem({ task, onToggle, onDelete, onMoveToToday }: Props) {
  const [offset, setOffset] = useState(0);
  const [pop, setPop] = useState(false);
  const startX = useRef<number | null>(null);
  const prevCompleted = useRef(task.completed);

  // Fire the completion animation only when the user checks it off — not on
  // initial mount of an already-completed task.
  useEffect(() => {
    if (!prevCompleted.current && task.completed) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 360);
      prevCompleted.current = task.completed;
      return () => clearTimeout(t);
    }
    prevCompleted.current = task.completed;
  }, [task.completed]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse") return; // swipe is touch/pen only
    startX.current = e.clientX;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -96));
  }
  function onPointerUp() {
    if (offset <= -64) onDelete();
    setOffset(0);
    startX.current = null;
  }

  return (
    <li className="group relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-sm text-red-700">
        Delete
      </div>
      <div
        className="flex min-h-11 items-center gap-3 bg-bg py-1 transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
          onClick={onToggle}
          className={`press flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all duration-150 hover:border-accent ${
            task.completed
              ? "scale-105 border-accent bg-accent text-on-accent"
              : "border-muted/50 bg-transparent"
          }`}
        >
          {task.completed && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path className="check-path" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <span className="flex-1 leading-tight">
          <span
            className={`inline transition-opacity ${
              task.completed ? "strike text-muted opacity-50" : ""
            } ${pop ? "strike-draw" : ""}`}
          >
            {task.text}
          </span>
        </span>

        {onMoveToToday && (
          <button
            aria-label="Move to today"
            onClick={onMoveToToday}
            className="press shrink-0 rounded-full border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-accent/50 hover:bg-tint hover:text-text"
          >
            → today
          </button>
        )}

        <button
          aria-label="Delete task"
          onClick={onDelete}
          className="press hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-tint hover:text-text group-hover:opacity-100 sm:flex"
        >
          ×
        </button>
      </div>
    </li>
  );
}
