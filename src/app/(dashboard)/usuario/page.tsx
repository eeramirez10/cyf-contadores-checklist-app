"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatRoleLabel } from "@/lib/formatters";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ProfileRow = {
  name: string;
  role: "ADMIN" | "LEADER" | "MEMBER";
};

export default function UsuarioPanelPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState<string>("Usuario");
  const [role, setRole] = useState<string>("MEMBER");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (!data.session) {
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("name,role")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (profile) {
        const row = profile as ProfileRow;
        setName(row.name);
        setRole(row.role);
      }
    };

    void loadSession();
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const email = session?.user.email ?? "Sin correo";

  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <article className="surface rounded-2xl p-5">
        <p className="status-pill text-gray-500">Perfil</p>
        <h2 className="display-title mt-2 text-2xl font-semibold text-gray-900">{name}</h2>
        <p className="mt-1 text-sm text-gray-500">{email}</p>
        <div className="mt-4 inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
          Rol: {formatRoleLabel(role)}
        </div>
      </article>

      <article className="surface rounded-2xl p-5">
        <p className="status-pill text-gray-500">Cuenta</p>
        <ul className="mt-3 grid gap-2 text-sm text-gray-700">
          <li className="rounded-lg border border-gray-200 bg-white px-3 py-2">Edit profile</li>
          <li className="rounded-lg border border-gray-200 bg-white px-3 py-2">Account settings</li>
          <li className="rounded-lg border border-gray-200 bg-white px-3 py-2">Support</li>
        </ul>
      </article>
    </section>
  );
}
