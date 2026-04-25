import { CotizacionDetailPage } from "@/features/cotizaciones/components/cotizacion-detail-page";

type CotizacionRoutePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CotizacionRoutePage({ params }: CotizacionRoutePageProps) {
  return <CotizacionDetailPage params={params} />;
}
