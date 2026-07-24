"use client";

import { useAuth } from "@/features/auth/components/auth-provider";
import { formatRoleLabel } from "@/lib/formatters";

export default function UsuarioPanelPage() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <p className="text-sm text-gray-500">Cargando perfil...</p>;
  }

  if (!user) {
    return <p className="text-sm text-gray-500">Inicia sesion para ver tu perfil.</p>;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <article className="surface rounded-2xl p-5">
        <p className="status-pill text-gray-500">Perfil</p>
        <h2 className="display-title mt-2 text-2xl font-semibold text-gray-900">{user.name}</h2>
        <p className="mt-1 text-sm text-gray-500">{user.email ?? "Sin correo"}</p>
        <div className="mt-4 inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
          Rol: {formatRoleLabel(user.role)}
        </div>
      </article>

      <article className="surface rounded-2xl p-5">
        <p className="status-pill text-gray-500">Cuenta</p>
        <ul className="mt-3 grid gap-2 text-sm text-gray-700">
          <li className="rounded-lg border border-gray-200 bg-white px-3 py-2">Perfil local</li>
          <li className="rounded-lg border border-gray-200 bg-white px-3 py-2">Configuracion de cuenta</li>
          <li className="rounded-lg border border-gray-200 bg-white px-3 py-2">Soporte</li>
        </ul>
      </article>
    </section>
  );
}
