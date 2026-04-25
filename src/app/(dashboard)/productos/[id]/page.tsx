import { ProductoDetailPage } from "@/features/productos/components/producto-detail-page";

type ProductoRoutePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductoRoutePage({ params }: ProductoRoutePageProps) {
  return <ProductoDetailPage params={params} />;
}
