"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAuth } from "@/features/auth/components/auth-provider";

export function LoginPage() {
  const router = useRouter();
  const { signIn: authenticate, status } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      await authenticate(email.trim(), password);
      setEmail("");
      setPassword("");
      toast.success("Sesion iniciada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar sesion.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading" || status === "authenticated") {
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
