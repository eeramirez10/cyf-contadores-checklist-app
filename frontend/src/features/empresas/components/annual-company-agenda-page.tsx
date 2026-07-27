"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useIndicatorsSocket } from "@/features/indicadores/hooks/use-indicators-socket";
import { useAuth } from "@/features/auth/components/auth-provider";
import { backendFetch } from "@/lib/backend-auth";

type AgendaView = "PROGRESS" | "PENDING";
type AgendaMonth = {
  month: string;
  period: "PAST" | "CURRENT" | "FUTURE";
  expectedCount: number;
  completedCount: number;
  progress: number | null;
  pending: {
    templateId: string;
    name: string;
    area: string;
    weight: number;
    status: "OVERDUE" | "PENDING";
  }[];
};
type AnnualAgenda = {
  company: { id: string; name: string };
  year: number;
  areas: {
    name: string;
    expectedCount: number;
    completedCount: number;
    progress: number | null;
  }[];
  months: AgendaMonth[];
};

const monthLabel = new Intl.DateTimeFormat("es-MX", {
  month: "short",
  timeZone: "UTC",
});

const formatMonth = (month: string) =>
  monthLabel
    .format(new Date(`${month}-01T00:00:00.000Z`))
    .replace(".", "")
    .toUpperCase();

const progressTone = (
  progress: number | null,
  period: AgendaMonth["period"],
) => {
  if (progress === null || period === "FUTURE") return "#94a3b8";
  if (progress < 60) return "#dc2626";
  if (progress < 80) return "#d97706";
  return "#16a34a";
};

type AnnualCompanyAgendaPageProps = { clientId: string };

export function AnnualCompanyAgendaPage({
  clientId,
}: AnnualCompanyAgendaPageProps) {
  const { status } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [view, setView] = useState<AgendaView>("PROGRESS");
  const [agenda, setAgenda] = useState<AnnualAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useIndicatorsSocket([clientId], null, () => {
    setRefreshIndex((current) => current + 1);
  });

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await backendFetch<AnnualAgenda>(
          `/companies/${clientId}/annual-agenda?year=${year}`,
        );
        if (active) setAgenda(data);
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "No se pudo cargar la agenda anual.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [clientId, refreshIndex, status, year]);

  const years = Array.from({ length: 4 }, (_, index) => currentYear - index);

  if (status === "loading" || loading) {
    return (
      <section className="surface rounded-3xl p-6 text-sm text-[var(--foreground-soft)]">
        Cargando agenda anual...
      </section>
    );
  }

  if (error || !agenda) {
    return (
      <section className="surface rounded-3xl p-6">
        <p className="text-sm text-red-700">
          {error ?? "Agenda no disponible."}
        </p>
        <Link
          href="/empresas"
          className="mt-4 inline-flex rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-medium"
        >
          Volver a empresas
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <article className="surface rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/empresas"
              className="text-xs font-medium text-[var(--foreground-soft)] hover:text-[var(--foreground)]"
            >
              Empresas / Agenda anual
            </Link>
            <h1 className="display-title mt-1 text-2xl font-semibold">
              {agenda.company.name}
            </h1>
            <p className="mt-1 text-sm text-[var(--foreground-soft)]">
              Seguimiento de cumplimiento y pendientes por mes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="soft-input px-3 py-2 text-sm"
              aria-label="Año de la agenda"
            >
              {years.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="rounded-xl border border-[var(--line)] bg-white p-1">
              <button
                type="button"
                onClick={() => setView("PROGRESS")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === "PROGRESS" ? "bg-[#0b315f] text-white" : "text-[var(--foreground-soft)]"}`}
              >
                Porcentaje de avance
              </button>
              <button
                type="button"
                onClick={() => setView("PENDING")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === "PENDING" ? "bg-[#0b315f] text-white" : "text-[var(--foreground-soft)]"}`}
              >
                Pendientes
              </button>
            </div>
          </div>
        </div>
      </article>

      <article className="surface rounded-3xl p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="display-title text-xl font-semibold">
              {view === "PROGRESS"
                ? "Porcentaje de avance / cumplimiento"
                : "Cumplimientos no alcanzados / pendientes"}
            </h2>
            <p className="mt-1 text-sm text-[var(--foreground-soft)]">
              {view === "PROGRESS"
                ? "El avance se calcula con los pesos vigentes en cada periodo."
                : "Los meses anteriores se muestran como vencidos; el mes actual como pendiente."}
            </p>
          </div>
          <span className="status-pill rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs text-[var(--foreground-soft)]">
            Actualización en tiempo real
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agenda.months.map((item) => {
            const tone = progressTone(item.progress, item.period);
            const completed = item.expectedCount === item.completedCount;
            return (
              <article
                key={item.month}
                className="rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="rounded-md bg-[#0b315f] px-2.5 py-1 text-xs font-bold text-white">
                    {formatMonth(item.month)}
                  </h3>
                  <Link
                    href={`/empresas?clientId=${encodeURIComponent(clientId)}&month=${item.month}&checklist=1`}
                    className="text-xs font-medium text-[#0f6cb4] hover:underline"
                  >
                    Ver checklist
                  </Link>
                </div>

                {view === "PROGRESS" ? (
                  <div className="flex min-h-36 flex-col items-center justify-center">
                    {item.progress === null ? (
                      <p className="text-center text-sm text-[var(--foreground-soft)]">
                        Sin actividades programadas
                      </p>
                    ) : (
                      <>
                        <div
                          className="grid h-20 w-20 place-items-center rounded-full"
                          style={{
                            background: `conic-gradient(${tone} ${item.progress * 3.6}deg, #e5e7eb 0deg)`,
                          }}
                        >
                          <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-base font-bold text-gray-800">
                            {item.progress.toFixed(1)}%
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-[var(--foreground-soft)]">
                          {item.completedCount}/{item.expectedCount} actividades
                          completadas
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 min-h-36">
                    {!item.expectedCount ? (
                      <p className="text-sm text-[var(--foreground-soft)]">
                        Sin actividades programadas.
                      </p>
                    ) : item.period === "FUTURE" ? (
                      <p className="text-sm text-[var(--foreground-soft)]">
                        {item.expectedCount} actividad
                        {item.expectedCount === 1 ? "" : "es"} programada
                        {item.expectedCount === 1 ? "" : "s"}.
                      </p>
                    ) : completed ? (
                      <p className="text-sm font-medium text-emerald-700">
                        Sin pendientes.
                      </p>
                    ) : (
                      <ul className="grid gap-2">
                        {item.pending.map((task) => (
                          <li
                            key={task.templateId}
                            className="rounded-lg bg-red-50 p-2 text-xs text-red-900"
                          >
                            <span className="font-semibold">{task.name}</span>
                            <span className="mt-0.5 block text-red-700">
                              {task.area} · {task.weight}% ·{" "}
                              {task.status === "OVERDUE"
                                ? "Vencida"
                                : "Pendiente"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </article>

      <article className="surface rounded-3xl p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="display-title text-xl font-semibold">
            Avance acumulado por departamento
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground-soft)]">
            Calculado con las actividades exigibles transcurridas en {year}.
          </p>
        </div>
        {agenda.areas.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agenda.areas.map((area) => {
              const progress = area.progress ?? 0;
              const tone = progressTone(progress, "CURRENT");
              return (
                <article
                  key={area.name}
                  className="rounded-2xl border border-[var(--line)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {area.name}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--foreground-soft)]">
                        {area.completedCount}/{area.expectedCount} actividades
                      </p>
                    </div>
                    <span className="text-lg font-bold" style={{ color: tone }}>
                      {area.progress === null
                        ? "-"
                        : `${area.progress.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, progress))}%`,
                        backgroundColor: tone,
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--foreground-soft)]">
            No hay actividades exigibles para este año.
          </p>
        )}
      </article>
    </section>
  );
}
