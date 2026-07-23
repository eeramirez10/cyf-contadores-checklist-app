import type { NextRequest } from "next/server";

import {
  handleDocumentsDelete,
  handleDocumentsPatch,
} from "@/server/services/document-center-service";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await context.params;
  return handleDocumentsDelete(request, documentId);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await context.params;
  return handleDocumentsPatch(request, documentId);
}
