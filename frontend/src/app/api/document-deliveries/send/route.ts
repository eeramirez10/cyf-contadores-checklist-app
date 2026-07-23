import type { NextRequest } from "next/server";

import {
  handleDeliveriesGet,
  handleSendDocumentPost,
} from "@/server/services/document-center-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleDeliveriesGet(request);
}

export async function POST(request: NextRequest) {
  return handleSendDocumentPost(request);
}
