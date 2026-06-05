"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="search"
        placeholder="Search your notes and titles…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search saved links"
        className="min-h-11 w-full rounded-lg bg-tint pl-10 pr-11 outline-none focus:ring-2 focus:ring-accent"
      />
      {/* An explicit exit from a search/tag filter — without it, clicking a tag
          can leave you stuck in a filtered view with no obvious way back. */}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear filter"
          title="Clear filter"
          className="press absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-bg hover:text-text"
        >
          ✕
        </button>
      )}
    </div>
  );
}
