import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/lib/types";
import { getSupabaseServerAnonClient, getSupabaseServerServiceClient } from "@/lib/supabase-server";
import { parseBearerToken } from "@/server/auth/bearer-token";

type RequesterProfile = {
  id: string;
  role: UserRole;
};

type ProfileRow = {
  id: string;
  name: string;
  role: UserRole;
  group_id: string | null;
  leader_id: string | null;
  created_at: string;
};

type GroupRow = {
  id: string;
  name: string;
  leader_id: string | null;
  created_at: string;
};

type CreateUserPayload = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
  role?: unknown;
  groupId?: unknown;
  leaderId?: unknown;
};

type UpdateUserPayload = {
  userId?: unknown;
  name?: unknown;
  role?: unknown;
  groupId?: unknown;
  leaderId?: unknown;
};

const isValidUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isValidRole = (value: string): value is UserRole =>
  value === "ADMIN" || value === "LEADER" || value === "MEMBER";

const normalizeOptionalUuid = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return isValidUuid(trimmed) ? trimmed : null;
};

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const requireAdmin = async (request: NextRequest): Promise<{
  requesterId: string;
  adminClient: ReturnType<typeof getSupabaseServerServiceClient>;
} | NextResponse> => {
  const token = parseBearerToken(request.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
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
    .select("id,role")
    .eq("id", requesterId)
    .maybeSingle();
  if (requesterRes.error || !requesterRes.data) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 403 });
  }

  const requester = requesterRes.data as RequesterProfile;
  if (requester.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos de administrador." }, { status: 403 });
  }

  return { requesterId, adminClient };
};

export async function handleAdminUsersGet(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }
    const { adminClient } = adminCheck;

    const [profilesRes, groupsRes, authUsersRes] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id,name,role,group_id,leader_id,created_at")
        .order("created_at", { ascending: false }),
      adminClient
        .from("groups")
        .select("id,name,leader_id,created_at")
        .order("name", { ascending: true }),
      adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (profilesRes.error || groupsRes.error || authUsersRes.error) {
      return NextResponse.json(
        {
          error:
            profilesRes.error?.message ??
            groupsRes.error?.message ??
            authUsersRes.error?.message ??
            "No se pudo cargar catalogo de usuarios.",
        },
        { status: 500 },
      );
    }

    const emailByUserId = new Map<string, string | null>();
    for (const authUser of authUsersRes.data.users ?? []) {
      emailByUserId.set(authUser.id, authUser.email ?? null);
    }

    const users = (profilesRes.data ?? []).map((row) => {
      const value = row as ProfileRow;
      return {
        ...value,
        email: emailByUserId.get(value.id) ?? null,
      };
    });

    return NextResponse.json({
      users,
      groups: (groupsRes.data ?? []) as GroupRow[],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function handleAdminUsersPost(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }
    const { adminClient } = adminCheck;

    const body = (await request.json()) as CreateUserPayload;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const roleRaw = typeof body.role === "string" ? body.role : "MEMBER";
    const groupIdRaw = normalizeOptionalUuid(body.groupId);
    const leaderIdRaw = normalizeOptionalUuid(body.leaderId);

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email invalido." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimo de 6 caracteres." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    }
    if (!isValidRole(roleRaw)) {
      return NextResponse.json({ error: "Rol invalido." }, { status: 400 });
    }

    const normalizedRole: UserRole = roleRaw;
    let normalizedGroupId = groupIdRaw;
    let normalizedLeaderId = leaderIdRaw;

    if (normalizedRole === "ADMIN") {
      normalizedGroupId = null;
      normalizedLeaderId = null;
    }
    if (normalizedRole === "LEADER") {
      normalizedLeaderId = null;
    }

    if (normalizedGroupId) {
      const groupRes = await adminClient
        .from("groups")
        .select("id")
        .eq("id", normalizedGroupId)
        .maybeSingle();
      if (groupRes.error || !groupRes.data) {
        return NextResponse.json({ error: "Grupo no encontrado." }, { status: 400 });
      }
    }

    if (normalizedLeaderId) {
      const leaderRes = await adminClient
        .from("profiles")
        .select("id,role,group_id")
        .eq("id", normalizedLeaderId)
        .maybeSingle();
      if (leaderRes.error || !leaderRes.data) {
        return NextResponse.json({ error: "Lider no encontrado." }, { status: 400 });
      }
      if (leaderRes.data.role !== "LEADER") {
        return NextResponse.json({ error: "El usuario seleccionado no es LEADER." }, { status: 400 });
      }
      if (normalizedGroupId && leaderRes.data.group_id && leaderRes.data.group_id !== normalizedGroupId) {
        return NextResponse.json(
          { error: "El lider no pertenece al grupo seleccionado." },
          { status: 400 },
        );
      }
      if (!normalizedGroupId && leaderRes.data.group_id) {
        normalizedGroupId = leaderRes.data.group_id;
      }
    }

    const createdUserRes = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      },
    });

    if (createdUserRes.error || !createdUserRes.data.user) {
      return NextResponse.json(
        { error: createdUserRes.error?.message ?? "No se pudo crear usuario." },
        { status: 400 },
      );
    }

    const createdUserId = createdUserRes.data.user.id;
    const profileRes = await adminClient
      .from("profiles")
      .upsert(
        {
          id: createdUserId,
          name,
          role: normalizedRole,
          group_id: normalizedGroupId,
          leader_id: normalizedLeaderId,
        },
        { onConflict: "id" },
      )
      .select("id,name,role,group_id,leader_id")
      .single();

    if (profileRes.error || !profileRes.data) {
      await adminClient.auth.admin.deleteUser(createdUserId);
      return NextResponse.json(
        { error: profileRes.error?.message ?? "No se pudo crear perfil." },
        { status: 500 },
      );
    }

    if (normalizedRole === "LEADER" && normalizedGroupId) {
      await adminClient
        .from("groups")
        .update({ leader_id: createdUserId })
        .eq("id", normalizedGroupId);
    }

    return NextResponse.json({ user: profileRes.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function handleAdminUsersPatch(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }
    const { adminClient } = adminCheck;

    const body = (await request.json()) as UpdateUserPayload;
    const userId = typeof body.userId === "string" ? body.userId : "";
    const name = typeof body.name === "string" ? body.name.trim() : null;
    const roleRaw = typeof body.role === "string" ? body.role : null;

    if (!isValidUuid(userId)) {
      return NextResponse.json({ error: "Usuario invalido." }, { status: 400 });
    }

    const currentProfileRes = await adminClient
      .from("profiles")
      .select("id,role,group_id,leader_id,name")
      .eq("id", userId)
      .maybeSingle();
    if (currentProfileRes.error || !currentProfileRes.data) {
      return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
    }

    const currentProfile = currentProfileRes.data as {
      id: string;
      role: UserRole;
      group_id: string | null;
      leader_id: string | null;
      name: string;
    };

    let normalizedRole = currentProfile.role;
    if (roleRaw !== null) {
      if (!isValidRole(roleRaw)) {
        return NextResponse.json({ error: "Rol invalido." }, { status: 400 });
      }
      normalizedRole = roleRaw;
    }

    let normalizedGroupId =
      body.groupId === undefined ? currentProfile.group_id : normalizeOptionalUuid(body.groupId);
    let normalizedLeaderId =
      body.leaderId === undefined ? currentProfile.leader_id : normalizeOptionalUuid(body.leaderId);

    if (normalizedRole === "ADMIN") {
      normalizedGroupId = null;
      normalizedLeaderId = null;
    }
    if (normalizedRole === "LEADER") {
      normalizedLeaderId = null;
    }

    if (normalizedGroupId) {
      const groupRes = await adminClient
        .from("groups")
        .select("id")
        .eq("id", normalizedGroupId)
        .maybeSingle();
      if (groupRes.error || !groupRes.data) {
        return NextResponse.json({ error: "Grupo no encontrado." }, { status: 400 });
      }
    }

    if (normalizedLeaderId) {
      if (normalizedLeaderId === userId) {
        return NextResponse.json({ error: "Un usuario no puede ser su propio lider." }, { status: 400 });
      }
      const leaderRes = await adminClient
        .from("profiles")
        .select("id,role,group_id")
        .eq("id", normalizedLeaderId)
        .maybeSingle();
      if (leaderRes.error || !leaderRes.data) {
        return NextResponse.json({ error: "Lider no encontrado." }, { status: 400 });
      }
      if (leaderRes.data.role !== "LEADER") {
        return NextResponse.json({ error: "El lider asignado debe tener rol LEADER." }, { status: 400 });
      }
      if (normalizedGroupId && leaderRes.data.group_id && leaderRes.data.group_id !== normalizedGroupId) {
        return NextResponse.json(
          { error: "El lider no pertenece al grupo seleccionado." },
          { status: 400 },
        );
      }
      if (!normalizedGroupId && leaderRes.data.group_id) {
        normalizedGroupId = leaderRes.data.group_id;
      }
    }

    const updatePayload: {
      name?: string;
      role: UserRole;
      group_id: string | null;
      leader_id: string | null;
    } = {
      role: normalizedRole,
      group_id: normalizedGroupId,
      leader_id: normalizedLeaderId,
    };
    if (name) {
      updatePayload.name = name;
    }

    const updateRes = await adminClient
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("id,name,role,group_id,leader_id")
      .single();

    if (updateRes.error || !updateRes.data) {
      return NextResponse.json(
        { error: updateRes.error?.message ?? "No se pudo actualizar usuario." },
        { status: 500 },
      );
    }

    if (normalizedRole === "LEADER" && normalizedGroupId) {
      await adminClient
        .from("groups")
        .update({ leader_id: userId })
        .eq("id", normalizedGroupId);
    }

    return NextResponse.json({ user: updateRes.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
