"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type PanelAuthGuardProps = {
  children: React.ReactNode;
};

export function PanelAuthGuard({ children }: PanelAuthGuardProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
      if (!data.session) {
        router.replace("/login");
      }
    };
    void bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        router.replace("/login");
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (!supabase) {
    return (
      <main className="app-grid-bg min-h-screen px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--line)] bg-white p-6">
          <h1 className="display-title text-2xl font-semibold">Falta configuracion de Supabase</h1>
          <p className="mt-2 text-sm text-[var(--foreground-soft)]">
            Agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local`.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="app-grid-bg min-h-screen px-4 py-10 md:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--foreground-soft)]">
          Verificando sesion...
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
