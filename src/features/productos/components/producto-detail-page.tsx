type ProductoDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function ProductoDetailPage({ params }: ProductoDetailPageProps) {
  const { id } = await params;

  return (
    <section className="surface rounded-2xl p-5">
      <h2 className="display-title text-xl font-semibold text-gray-900">Producto #{id}</h2>
      <p className="mt-2 text-sm text-gray-600">Detalle de producto listo para implementar.</p>
    </section>
  );
}
