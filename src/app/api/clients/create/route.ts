import type { NextRequest } from "next/server";
import { handleCreateClientPost } from "@/server/services/clients-service";

export async function POST(request: NextRequest) {
  return handleCreateClientPost(request);
}
