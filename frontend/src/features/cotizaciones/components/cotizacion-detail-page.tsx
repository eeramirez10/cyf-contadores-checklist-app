type CotizacionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function CotizacionDetailPage({ params }: CotizacionDetailPageProps) {
  const { id } = await params;

  return (
    <section className="surface rounded-2xl p-5">
      <h2 className="display-title text-xl font-semibold text-gray-900">Cotizacion #{id}</h2>
      <p className="mt-2 text-sm text-gray-600">Detalle de cotizacion listo para implementar.</p>
    </section>
  );
}
