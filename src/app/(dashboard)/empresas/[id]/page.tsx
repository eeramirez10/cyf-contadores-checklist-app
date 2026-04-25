import { EmpresaDetailPage } from "@/features/empresas/components/empresa-detail-page";

type EmpresaRoutePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EmpresaRoutePage({ params }: EmpresaRoutePageProps) {
  return <EmpresaDetailPage params={params} />;
}
