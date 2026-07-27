import Link from "next/link";

type EmpresaDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function EmpresaDetailPage({ params }: EmpresaDetailPageProps) {
  const { id } = await params;

  return (
    <section className="surface rounded-2xl p-5">
      <h2 className="display-title text-xl font-semibold text-gray-900">
        Empresa #{id}
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Vista detallada por ruta lista para crecer. Mientras tanto puedes usar
        la vista global de empresas.
      </p>
      <Link
        href={`/empresas?clientId=${encodeURIComponent(id)}`}
        className="mt-4 inline-flex rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        Abrir checklist de esta empresa
      </Link>
      <Link
        href={`/empresas/${encodeURIComponent(id)}/agenda`}
        className="mt-3 inline-flex rounded-lg bg-[#0b315f] px-3 py-2 text-sm font-medium text-white"
      >
        Ver agenda anual
      </Link>
    </section>
  );
}
