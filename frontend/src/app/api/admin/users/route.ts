import type { NextRequest } from "next/server";
import {
  handleAdminUsersGet,
  handleAdminUsersPatch,
  handleAdminUsersPost,
} from "@/server/services/admin-users-service";

export async function GET(request: NextRequest) {
  return handleAdminUsersGet(request);
}

export async function POST(request: NextRequest) {
  return handleAdminUsersPost(request);
}

export async function PATCH(request: NextRequest) {
  return handleAdminUsersPatch(request);
}
