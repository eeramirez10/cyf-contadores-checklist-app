import { redirect } from "next/navigation";

type ClientRoutePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientRoutePage({ params }: ClientRoutePageProps) {
  const { id } = await params;
  redirect(`/empresas/${encodeURIComponent(id)}`);
}
