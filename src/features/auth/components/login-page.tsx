"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { toast } from "react-toastify";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(supabase));
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
      if (data.session) {
        router.replace("/dashboard");
      }
    };
    void bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        router.replace("/dashboard");
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [router, supabase]);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setEmail("");
      setPassword("");
      toast.success("Sesion iniciada.");
    } catch (error) {
      const fallbackResponse = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const payload = (await fallbackResponse.json().catch(() => ({}))) as {
        access_token?: string;
        refresh_token?: string;
        error?: string;
      };

      if (!fallbackResponse.ok || !payload.access_token || !payload.refresh_token) {
        const message =
          payload.error ??
          (error instanceof Error ? error.message : "No se pudo iniciar sesion.");
        toast.error(message);
        return;
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      if (setSessionError) {
        toast.error(setSessionError.message);
        return;
      }

      setEmail("");
      setPassword("");
      toast.success("Sesion iniciada.");
    } finally {
      setBusy(false);
    }
  };

  if (!supabase) {
    return (
      <main className="app-grid-bg min-h-screen px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--line)] bg-white p-6">
          <h1 className="display-title text-3xl font-semibold">Falta configuracion de Supabase</h1>
          <p className="mt-2 text-sm text-[var(--foreground-soft)]">
            Agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local`.
          </p>
        </div>
      </main>
    );
  }

  if (loading || session) {
    return (
      <main className="app-grid-bg min-h-screen px-4 py-10 md:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--foreground-soft)]">
          Cargando...
        </div>
      </main>
    );
  }

  return (
    <main className="app-grid-bg min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-md rounded-2xl border border-[var(--line)] bg-white p-6">
        <p className="status-pill text-xs text-[var(--foreground-soft)]">Acceso</p>
        <h1 className="display-title mt-2 text-3xl font-semibold">Iniciar sesion</h1>
        <p className="mt-2 text-sm text-[var(--foreground-soft)]">
          El alta de usuarios la hace el administrador desde el panel.
        </p>

        <form onSubmit={signIn} className="mt-4 grid gap-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="soft-input px-3 py-2 text-sm"
            placeholder="correo@empresa.com"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="soft-input px-3 py-2 text-sm"
            placeholder="********"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[linear-gradient(180deg,#4f67ff_0%,#3641f5_100%)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Procesando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
