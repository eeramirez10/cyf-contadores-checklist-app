"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "react-toastify";
import {
  createAdminUser,
  updateAdminUser,
} from "@/features/auth/services/admin-users-api";
import type {
  GroupRow,
  ManagedUser,
  UsersApiResponse,
} from "@/features/auth/types/admin-users";
import { USER_ROLE_OPTIONS } from "@/features/auth/utils/user-role-options";
import { formatRoleLabel } from "@/lib/formatters";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/types";

export function UsersManagementPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [forbidden, setForbidden] = useState<boolean>(false);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);

  const [newUserName, setNewUserName] = useState<string>("");
  const [newUserEmail, setNewUserEmail] = useState<string>("");
  const [newUserPassword, setNewUserPassword] = useState<string>("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("MEMBER");
  const [newUserGroupId, setNewUserGroupId] = useState<string>("NONE");
  const [newUserLeaderId, setNewUserLeaderId] = useState<string>("NONE");
  const [creatingUser, setCreatingUser] = useState<boolean>(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState<boolean>(false);

  const [newGroupName, setNewGroupName] = useState<string>("");
  const [newGroupLeaderId, setNewGroupLeaderId] = useState<string>("NONE");
  const [creatingGroup, setCreatingGroup] = useState<boolean>(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState<boolean>(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editRole, setEditRole] = useState<UserRole>("MEMBER");
  const [editGroupId, setEditGroupId] = useState<string>("NONE");
  const [editLeaderId, setEditLeaderId] = useState<string>("NONE");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const groupsById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const leaders = useMemo(() => users.filter((user) => user.role === "LEADER"), [users]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoadingSession(false);
    };

    void loadSession();
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoadingSession(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    if (!supabase) {
      return null;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (!sessionError && sessionData.session?.access_token) {
      setSession(sessionData.session);
      return sessionData.session.access_token;
    }

    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session?.access_token) {
      setSession(null);
      return null;
    }

    setSession(refreshData.session);
    return refreshData.session.access_token;
  }, [supabase]);

  const loadAdminCatalog = useCallback(async () => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      toast.error("Sesion invalida. Inicia sesion de nuevo.");
      return;
    }

    setLoadingData(true);
    let response = await fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401 && supabase) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      const refreshedToken = refreshData.session?.access_token ?? null;
      if (refreshedToken) {
        setSession(refreshData.session);
        response = await fetch("/api/admin/users", {
          headers: {
            Authorization: `Bearer ${refreshedToken}`,
          },
        });
      }
    }

    const payload = (await response.json().catch(() => ({}))) as UsersApiResponse;
    setLoadingData(false);

    if (response.status === 403) {
      setForbidden(true);
      return;
    }
    if (!response.ok) {
      toast.error(payload.error ?? "No se pudo cargar usuarios.");
      return;
    }

    setForbidden(false);
    setUsers(payload.users ?? []);
    setGroups(payload.groups ?? []);
  }, [getValidAccessToken, supabase]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadAdminCatalog();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAdminCatalog, session?.access_token]);

  useEffect(() => {
    const hasOpenModal =
      isCreateUserModalOpen || isCreateGroupModalOpen || Boolean(editingUserId);
    if (!hasOpenModal) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setIsCreateUserModalOpen(false);
      setIsCreateGroupModalOpen(false);
      setEditingUserId(null);
      setEditName("");
      setEditRole("MEMBER");
      setEditGroupId("NONE");
      setEditLeaderId("NONE");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editingUserId, isCreateGroupModalOpen, isCreateUserModalOpen]);

  const resetCreateUserForm = () => {
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole("MEMBER");
    setNewUserGroupId("NONE");
    setNewUserLeaderId("NONE");
  };

  const openCreateUserModal = () => {
    resetCreateUserForm();
    setIsCreateUserModalOpen(true);
  };

  const openCreateGroupModal = () => {
    setNewGroupName("");
    setNewGroupLeaderId("NONE");
    setIsCreateGroupModalOpen(true);
  };

  const onCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      toast.error("Sesion invalida. Inicia sesion de nuevo.");
      return;
    }

    setCreatingUser(true);
    try {
      await createAdminUser(accessToken, {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        groupId: newUserRole === "ADMIN" ? null : newUserGroupId === "NONE" ? null : newUserGroupId,
        leaderId: newUserRole !== "MEMBER" ? null : newUserLeaderId === "NONE" ? null : newUserLeaderId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear usuario.";
      toast.error(message);
      setCreatingUser(false);
      return;
    }
    setCreatingUser(false);

    toast.success("Usuario creado.");
    setIsCreateUserModalOpen(false);
    await loadAdminCatalog();
  };

  const onCreateGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    const trimmedName = newGroupName.trim();
    if (!trimmedName) {
      toast.warning("Escribe nombre del grupo.");
      return;
    }

    setCreatingGroup(true);
    const { data, error } = await supabase
      .from("groups")
      .insert({
        name: trimmedName,
        leader_id: newGroupLeaderId === "NONE" ? null : newGroupLeaderId,
      })
      .select("id,name")
      .single();
    setCreatingGroup(false);

    if (error || !data) {
      toast.error(`No se pudo crear grupo: ${error?.message ?? "Error desconocido"}`);
      return;
    }

    if (newGroupLeaderId !== "NONE") {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        toast.warning("Grupo creado, pero no se pudo ligar lider por sesion invalida.");
      } else {
      const linkLeaderRes = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: newGroupLeaderId,
          role: "LEADER",
          groupId: data.id,
          leaderId: null,
        }),
      });
      if (!linkLeaderRes.ok) {
        const payload = (await linkLeaderRes.json().catch(() => ({}))) as { error?: string };
        toast.warning(
          payload.error
            ? `Grupo creado, pero no se pudo ligar lider de grupo: ${payload.error}`
            : "Grupo creado, pero no se pudo ligar lider de grupo.",
        );
      }
      }
    }

    toast.success("Grupo creado.");
    setIsCreateGroupModalOpen(false);
    await loadAdminCatalog();
  };

  const startEdit = (user: ManagedUser) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditRole(user.role);
    setEditGroupId(user.group_id ?? "NONE");
    setEditLeaderId(user.leader_id ?? "NONE");
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditName("");
    setEditRole("MEMBER");
    setEditGroupId("NONE");
    setEditLeaderId("NONE");
  };

  const onSaveEdit = async () => {
    if (!editingUserId) {
      return;
    }
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      toast.error("Sesion invalida. Inicia sesion de nuevo.");
      return;
    }

    setSavingEdit(true);
    try {
      await updateAdminUser(accessToken, {
        userId: editingUserId,
        name: editName.trim(),
        role: editRole,
        groupId: editRole === "ADMIN" ? null : editGroupId === "NONE" ? null : editGroupId,
        leaderId: editRole !== "MEMBER" ? null : editLeaderId === "NONE" ? null : editLeaderId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar cambios.";
      toast.error(message);
      setSavingEdit(false);
      return;
    }
    setSavingEdit(false);

    toast.success("Usuario actualizado.");
    cancelEdit();
    await loadAdminCatalog();
  };

  if (!supabase) {
    return (
      <article className="surface rounded-2xl p-5">
        <h2 className="display-title text-xl font-semibold">Falta configuracion de Supabase</h2>
      </article>
    );
  }

  if (loadingSession || loadingData) {
    return (
      <article className="surface rounded-2xl p-5 text-sm text-gray-600">
        Cargando administracion de usuarios...
      </article>
    );
  }

  if (forbidden) {
    return (
      <article className="surface rounded-2xl p-5">
        <h2 className="display-title text-xl font-semibold">Sin permisos</h2>
        <p className="mt-2 text-sm text-gray-600">
          Solo los usuarios con rol <strong>Administrador</strong> pueden crear y ligar usuarios.
        </p>
      </article>
    );
  }

  if (!session) {
    return (
      <article className="surface rounded-2xl p-5">
        <h2 className="display-title text-xl font-semibold">Sin sesion</h2>
        <p className="mt-2 text-sm text-gray-600">Inicia sesion para administrar usuarios.</p>
      </article>
    );
  }

  return (
    <>
      <section className="surface rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="display-title text-xl font-semibold text-gray-900">Usuarios y ligado</h2>
            <p className="mt-1 text-sm text-gray-500">
              Solo tabla en esta vista. Usa los botones para crear por modal.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreateGroupModal}
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Crear grupo
            </button>
            <button
              type="button"
              onClick={openCreateUserModal}
              className="rounded-xl bg-[linear-gradient(180deg,#4f67ff_0%,#3641f5_100%)] px-4 py-2 text-sm font-medium text-white"
            >
              Crear usuario
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-auto rounded-xl border border-[var(--line)] bg-white">
          <table className="w-full min-w-[940px] border-collapse text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Rol</th>
                <th className="px-3 py-2 text-left">Grupo</th>
                <th className="px-3 py-2 text-left">Lider de grupo</th>
                <th className="px-3 py-2 text-center">Accion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-[var(--line)] odd:bg-white even:bg-[#f8fbff]">
                  <td className="px-3 py-2 font-medium text-gray-800">{user.name}</td>
                  <td className="px-3 py-2 text-gray-600">{user.email ?? "Sin email"}</td>
                  <td className="px-3 py-2 text-gray-700">{formatRoleLabel(user.role)}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {user.group_id ? groupsById.get(user.group_id)?.name ?? "Sin grupo" : "Sin grupo"}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {user.leader_id ? usersById.get(user.leader_id)?.name ?? "N/A" : "Sin lider de grupo"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => startEdit(user)}
                      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isCreateUserModalOpen ? (
        <div
          className="fixed inset-0 z-[80] bg-[#10182880] p-4 backdrop-blur-[1px]"
          onClick={() => setIsCreateUserModalOpen(false)}
        >
          <div
            className="mx-auto mt-[8vh] w-full max-w-2xl rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_18px_34px_rgba(16,24,40,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="display-title text-xl font-semibold text-gray-900">Crear usuario</h3>
              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(false)}
                className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs text-gray-700"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={onCreateUser} className="mt-4 grid gap-3">
              <input
                value={newUserName}
                onChange={(event) => setNewUserName(event.target.value)}
                className="soft-input h-10 px-3 text-sm"
                placeholder="Nombre completo"
                required
              />
              <input
                type="email"
                value={newUserEmail}
                onChange={(event) => setNewUserEmail(event.target.value)}
                className="soft-input h-10 px-3 text-sm"
                placeholder="correo@empresa.com"
                required
              />
              <input
                type="password"
                value={newUserPassword}
                onChange={(event) => setNewUserPassword(event.target.value)}
                className="soft-input h-10 px-3 text-sm"
                placeholder="Password temporal"
                minLength={6}
                required
              />
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={newUserRole}
                  onChange={(event) => setNewUserRole(event.target.value as UserRole)}
                  className="soft-input h-10 px-3 text-sm"
                >
                  {USER_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {formatRoleLabel(role)}
                    </option>
                  ))}
                </select>
                <select
                  value={newUserGroupId}
                  onChange={(event) => setNewUserGroupId(event.target.value)}
                  className="soft-input h-10 px-3 text-sm"
                  disabled={newUserRole === "ADMIN"}
                >
                  <option value="NONE">Sin grupo</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newUserLeaderId}
                  onChange={(event) => setNewUserLeaderId(event.target.value)}
                  className="soft-input h-10 px-3 text-sm"
                  disabled={newUserRole !== "MEMBER"}
                >
                  <option value="NONE">Sin lider de grupo</option>
                  {leaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {leader.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={creatingUser}
                className="rounded-xl bg-[linear-gradient(180deg,#4f67ff_0%,#3641f5_100%)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {creatingUser ? "Creando..." : "Crear usuario"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isCreateGroupModalOpen ? (
        <div
          className="fixed inset-0 z-[80] bg-[#10182880] p-4 backdrop-blur-[1px]"
          onClick={() => setIsCreateGroupModalOpen(false)}
        >
          <div
            className="mx-auto mt-[12vh] w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_18px_34px_rgba(16,24,40,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="display-title text-xl font-semibold text-gray-900">Crear grupo</h3>
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs text-gray-700"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={onCreateGroup} className="mt-4 grid gap-3">
              <input
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                className="soft-input h-10 px-3 text-sm"
                placeholder="Nombre del grupo"
                required
              />
              <select
                value={newGroupLeaderId}
                onChange={(event) => setNewGroupLeaderId(event.target.value)}
                className="soft-input h-10 px-3 text-sm"
              >
                <option value="NONE">Sin lider de grupo</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={creatingGroup}
                className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60"
              >
                {creatingGroup ? "Creando..." : "Crear grupo"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {editingUserId ? (
        <div className="fixed inset-0 z-[80] bg-[#10182880] p-4 backdrop-blur-[1px]" onClick={cancelEdit}>
          <div
            className="mx-auto mt-[10vh] w-full max-w-3xl rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_18px_34px_rgba(16,24,40,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="display-title text-xl font-semibold text-gray-900">Editar usuario</h3>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs text-gray-700"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="soft-input h-10 px-3 text-sm"
                placeholder="Nombre"
              />
              <select
                value={editRole}
                onChange={(event) => setEditRole(event.target.value as UserRole)}
                className="soft-input h-10 px-3 text-sm"
              >
                {USER_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {formatRoleLabel(role)}
                  </option>
                ))}
              </select>
              <select
                value={editGroupId}
                onChange={(event) => setEditGroupId(event.target.value)}
                className="soft-input h-10 px-3 text-sm"
                disabled={editRole === "ADMIN"}
              >
                <option value="NONE">Sin grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <select
                value={editLeaderId}
                onChange={(event) => setEditLeaderId(event.target.value)}
                className="soft-input h-10 px-3 text-sm"
                disabled={editRole !== "MEMBER"}
              >
                <option value="NONE">Sin lider de grupo</option>
                {leaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void onSaveEdit()}
                disabled={savingEdit}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-gray-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
