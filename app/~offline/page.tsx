export const metadata = {
  title: "Offline — Keystone",
};

export default function Offline() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 text-center">
      <div>
        <h1 className="font-serif text-3xl font-semibold">You&apos;re offline</h1>
        <p className="mt-3 text-sm text-muted">
          Keystone will reconnect and sync your changes automatically.
        </p>
      </div>
    </main>
  );
}
