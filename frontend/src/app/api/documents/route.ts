import type { NextRequest } from "next/server";

import {
  handleDocumentsGet,
  handleDocumentsPost,
} from "@/server/services/document-center-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleDocumentsGet(request);
}

export async function POST(request: NextRequest) {
  return handleDocumentsPost(request);
}
