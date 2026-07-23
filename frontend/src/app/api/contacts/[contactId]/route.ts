import type { NextRequest } from "next/server";

import { handleContactsDelete } from "@/server/services/document-center-service";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ contactId: string }> },
) {
  const { contactId } = await context.params;
  return handleContactsDelete(request, contactId);
}
