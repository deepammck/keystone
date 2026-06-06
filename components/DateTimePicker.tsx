"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  formatEventTime,
  monthGridDays,
  monthLabel,
  shiftMonth,
  todayInTz,
} from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

type Props = {
  value: string; // "yyyy-MM-ddTHH:mm" or ""
  onChange: (value: string) => void;
  timezone: string;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function splitValue(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

export function DateTimePicker({ value, onChange, timezone }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { date: selectedDate, time: selectedTime } = splitValue(value);
  const today = todayInTz(timezone);

  // Month the grid is showing — seeded from the selection, else today.
  const [view, setView] = useState(() => {
    const seed = selectedDate || today;
    const [y, m] = seed.split("-").map(Number);
    return { year: y, month: m - 1 };
  });

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openPicker() {
    const seed = selectedDate || today;
    const [y, m] = seed.split("-").map(Number);
    setView({ year: y, month: m - 1 });
    setOpen(true);
  }

  function pickDay(day: Date) {
    const dateStr = format(day, "yyyy-MM-dd");
    const time = selectedTime || format(new Date(), "HH:mm");
    onChange(`${dateStr}T${time}`);
  }

  function changeTime(time: string) {
    if (!time) return;
    const dateStr = selectedDate || today;
    onChange(`${dateStr}T${time}`);
  }

  const days = monthGridDays(view.year, view.month);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="min-h-11 w-full rounded-lg bg-bg px-4 text-left outline-none transition-colors focus:ring-2 focus:ring-ring"
      >
        {value ? (
          <span>{formatEventTime(value)}</span>
        ) : (
          <span className="text-muted">Pick a date &amp; time</span>
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-border bg-bg p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-serif text-base font-semibold">
              {monthLabel(view.year, view.month)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}
                className="press flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-tint-strong hover:text-text"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}
                className="press flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-tint-strong hover:text-text"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d, i) => (
              <div
                key={i}
                className="flex h-7 items-center justify-center text-xs text-muted"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const inMonth = day.getMonth() === view.month;
              const isSelected = dayStr === selectedDate;
              const isToday = dayStr === today;
              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={`press flex h-9 items-center justify-center rounded-md border text-sm transition-all duration-150 ${
                    isSelected
                      ? "border-accent bg-accent font-medium text-on-accent"
                      : `border-transparent hover:border-accent/50 ${
                          inMonth ? "text-text" : "text-muted/50"
                        } ${isToday ? "text-accent-soft" : ""}`
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
            <span className="text-sm text-muted">Time</span>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => changeTime(e.target.value)}
              className="min-h-9 flex-1 rounded-lg bg-tint px-3 outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}
    </div>
  );
}
