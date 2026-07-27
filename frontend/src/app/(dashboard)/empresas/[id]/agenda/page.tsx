import { AnnualCompanyAgendaPage } from "@/features/empresas/components/annual-company-agenda-page";

type AnnualAgendaRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function AnnualAgendaRoutePage({
  params,
}: AnnualAgendaRouteProps) {
  const { id } = await params;
  return <AnnualCompanyAgendaPage clientId={id} />;
}
