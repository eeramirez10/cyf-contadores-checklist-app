import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerAnonClient, getSupabaseServerServiceClient } from "@/lib/supabase-server";
import type { UserRole } from "@/lib/types";
import { parseBearerToken } from "@/server/auth/bearer-token";

type CreateClientPayload = {
  name?: unknown;
  memberId?: unknown;
  templateIds?: unknown;
};

type ProfileRow = {
  id: string;
  role: UserRole;
  group_id: string | null;
  leader_id: string | null;
};

const isValidUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const canAssignMember = (requester: ProfileRow, target: ProfileRow): boolean => {
  if (requester.role === "ADMIN") {
    return true;
  }
  if (requester.role === "MEMBER") {
    return requester.id === target.id;
  }
  if (requester.role === "LEADER") {
    if (target.leader_id === requester.id) {
      return true;
    }
    return requester.group_id !== null && target.group_id === requester.group_id;
  }
  return false;
};

export async function handleCreateClientPost(request: NextRequest) {
  try {
    const token = parseBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as CreateClientPayload;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const memberId = typeof body.memberId === "string" ? body.memberId : "";
    const templateIds =
      Array.isArray(body.templateIds) && body.templateIds.every((value) => typeof value === "string")
        ? body.templateIds
        : [];

    if (!name) {
      return NextResponse.json({ error: "Nombre de empresa vacio." }, { status: 400 });
    }
    if (!isValidUuid(memberId)) {
      return NextResponse.json({ error: "Contador invalido." }, { status: 400 });
    }
    if (!templateIds.length) {
      return NextResponse.json({ error: "Selecciona al menos una actividad." }, { status: 400 });
    }
    if (!templateIds.every((id) => isValidUuid(id))) {
      return NextResponse.json({ error: "Hay actividades invalidas." }, { status: 400 });
    }

    const anonClient = getSupabaseServerAnonClient();
    const authRes = await anonClient.auth.getUser(token);
    if (authRes.error || !authRes.data.user) {
      return NextResponse.json({ error: "Sesion invalida." }, { status: 401 });
    }
    const requesterId = authRes.data.user.id;

    const adminClient = getSupabaseServerServiceClient();

    const requesterRes = await adminClient
      .from("profiles")
      .select("id,role,group_id,leader_id")
      .eq("id", requesterId)
      .maybeSingle();
    if (requesterRes.error || !requesterRes.data) {
      return NextResponse.json({ error: "Perfil del usuario activo no encontrado." }, { status: 403 });
    }

    const targetRes = await adminClient
      .from("profiles")
      .select("id,role,group_id,leader_id")
      .eq("id", memberId)
      .maybeSingle();
    if (targetRes.error || !targetRes.data) {
      return NextResponse.json({ error: "Perfil del contador no encontrado." }, { status: 404 });
    }

    const requester = requesterRes.data as ProfileRow;
    const target = targetRes.data as ProfileRow;
    if (!canAssignMember(requester, target)) {
      return NextResponse.json(
        { error: "Sin permisos para asignar ese contador." },
        { status: 403 },
      );
    }

    const uniqueTemplateIds = Array.from(new Set(templateIds));
    const templatesRes = await adminClient
      .from("activity_templates")
      .select("id,name,area,default_weight,display_order,is_active")
      .in("id", uniqueTemplateIds);
    if (templatesRes.error) {
      return NextResponse.json(
        { error: `No se pudieron leer actividades: ${templatesRes.error.message}` },
        { status: 500 },
      );
    }
    const activeTemplates = (templatesRes.data ?? []).filter((item) => item.is_active);
    if (!activeTemplates.length) {
      return NextResponse.json(
        { error: "No hay actividades activas para asignar a la empresa." },
        { status: 400 },
      );
    }

    const createdClientRes = await adminClient
      .from("clients")
      .insert({
        name,
        member_id: memberId,
        is_active: true,
      })
      .select("id")
      .single();
    if (createdClientRes.error || !createdClientRes.data) {
      return NextResponse.json(
        { error: `No se pudo crear empresa: ${createdClientRes.error?.message ?? "Error desconocido"}` },
        { status: 500 },
      );
    }

    const clientId = createdClientRes.data.id as string;
    const activitiesPayload = activeTemplates
      .sort((left, right) => left.display_order - right.display_order)
      .map((template, index) => ({
        client_id: clientId,
        template_id: template.id,
        name: template.name,
        area: template.area,
        weight: template.default_weight,
        display_order: index + 1,
        is_active: true,
      }));

    const activitiesRes = await adminClient.from("client_activities").insert(activitiesPayload);
    if (activitiesRes.error) {
      await adminClient.from("clients").delete().eq("id", clientId);
      return NextResponse.json(
        { error: `Empresa creada sin actividades, revertido: ${activitiesRes.error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ clientId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
