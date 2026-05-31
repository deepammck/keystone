"use client";

export function OfflineIndicator({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div className="rounded-lg bg-tint-strong px-4 py-2 text-center text-xs text-muted">
      Offline — changes will sync when you reconnect.
    </div>
  );
}
