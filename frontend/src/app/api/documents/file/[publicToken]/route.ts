import { handlePublicDocumentGet } from "@/server/services/document-center-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await context.params;
  return handlePublicDocumentGet(publicToken);
}
