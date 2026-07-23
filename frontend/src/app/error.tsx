"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="app-grid-bg min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--line)] bg-white p-6">
        <h1 className="display-title text-3xl font-semibold">Ocurrio un error</h1>
        <p className="mt-2 text-sm text-[var(--foreground-soft)]">
          Intenta de nuevo. Si persiste, revisa logs del servidor.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
