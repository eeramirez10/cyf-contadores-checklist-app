import Link from "next/link";

export function CotizacionesPage() {
  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="display-title text-xl font-semibold text-gray-900">Cotizaciones</h2>
          <p className="mt-1 text-sm text-gray-500">Modulo base preparado para integrar flujo comercial.</p>
        </div>
        <Link
          href="/cotizaciones/nueva"
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
        >
          Nueva cotizacion
        </Link>
      </div>
    </section>
  );
}
