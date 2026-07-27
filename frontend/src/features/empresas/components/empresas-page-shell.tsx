"use client";

import type { ReactNode } from "react";
import type { EmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";
import { PanelLoader } from "@/components/layout/panel-loader";

type EmpresasPageShellProps = {
  state: EmpresasDashboardState;
  children: ReactNode;
};

export function EmpresasPageShell({ state, children }: EmpresasPageShellProps) {
  if (state.authLoading || !state.hasLoadedData) {
    return <PanelLoader />;
  }

  if (!state.session) {
    return (
      <article className="surface rounded-3xl p-6 text-sm text-[var(--foreground-soft)]">
        Redirigiendo a login...
      </article>
    );
  }

  if (!state.currentUser) {
    return (
      <article className="surface rounded-3xl p-6">
        <h2 className="display-title text-2xl font-semibold">
          Perfil sin permisos
        </h2>
        <p className="mt-2 text-sm text-[var(--foreground-soft)]">
          Tu usuario local esta autenticado, pero no tiene un perfil disponible
          para el panel.
        </p>
        <button
          type="button"
          onClick={() => {
            void state.signOut();
          }}
          className="mt-4 rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
        >
          Cerrar sesion
        </button>
      </article>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {state.message ? (
        <p className="rounded-xl border border-[var(--line)] bg-[linear-gradient(180deg,#f0f6ff_0%,#e9f2fd_100%)] px-3 py-2 text-sm text-[var(--foreground-soft)]">
          {state.message}
        </p>
      ) : null}
      {children}
    </div>
  );
}
