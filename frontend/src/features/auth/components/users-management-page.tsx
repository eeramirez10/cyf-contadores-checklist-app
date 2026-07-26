"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/features/auth/components/auth-provider";
import { backendFetch } from "@/lib/backend-auth";

type ManagedRole = "ADMIN" | "LEADER" | "MEMBER";
type ManagedUser = {
  id: string;
  name: string;
  email: string | null;
  role: ManagedRole;
  group_id: string | null;
  leader_id: string | null;
  is_active: boolean;
};
type ManagedGroup = { id: string; name: string; leader_id: string | null };

export function UsersManagementPage() {
  const { status, user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [groups, setGroups] = useState<ManagedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<ManagedRole>("MEMBER");
  const [groupId, setGroupId] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingRole, setEditingRole] = useState<ManagedRole>("MEMBER");
  const [editingGroupId, setEditingGroupId] = useState("");
  const [editingLeaderId, setEditingLeaderId] = useState("");
  const [editingIsActive, setEditingIsActive] = useState(true);

  const leaders = useMemo(
    () => users.filter((item) => item.role === "LEADER" && item.is_active),
    [users],
  );
  const groupsById = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups],
  );
  const usersById = useMemo(
    () => new Map(users.map((item) => [item.id, item])),
    [users],
  );

  const load = useCallback(async () => {
    if (status !== "authenticated" || user?.role !== "ADMIN") {
      return;
    }
    setLoading(true);
    try {
      const data = await backendFetch<{
        users: ManagedUser[];
        groups: ManagedGroup[];
      }>("/admin/users");
      setUsers(data.users);
      setGroups(data.groups);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cargar usuarios.",
      );
    } finally {
      setLoading(false);
    }
  }, [status, user?.role]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await backendFetch("/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          groupId: role === "ADMIN" ? undefined : groupId || undefined,
          leaderId: role === "MEMBER" ? leaderId || undefined : undefined,
        }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("MEMBER");
      setGroupId("");
      setLeaderId("");
      toast.success("Usuario local creado.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear usuario.",
      );
    }
  };

  const createGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const group = await backendFetch<ManagedGroup>("/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName }),
      });
      setNewGroupName("");
      setGroupId(group.id);
      toast.success("Grupo creado.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear grupo.",
      );
    }
  };

  const startEditing = (managedUser: ManagedUser) => {
    setEditingUser(managedUser);
    setEditingName(managedUser.name);
    setEditingRole(managedUser.role);
    setEditingGroupId(managedUser.group_id ?? "");
    setEditingLeaderId(managedUser.leader_id ?? "");
    setEditingIsActive(managedUser.is_active);
  };

  const cancelEditing = () => setEditingUser(null);

  const updateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    try {
      await backendFetch(`/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingName,
          role: editingRole,
          groupId: editingRole === "ADMIN" ? null : editingGroupId || null,
          leaderId: editingRole === "MEMBER" ? editingLeaderId || null : null,
          isActive: editingIsActive,
        }),
      });
      toast.success("Usuario actualizado.");
      cancelEditing();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar usuario.",
      );
    }
  };

  if (status === "loading" || loading) {
    return (
      <article className="surface rounded-2xl p-5 text-sm text-gray-600">
        Cargando usuarios...
      </article>
    );
  }
  if (user?.role !== "ADMIN") {
    return (
      <article className="surface rounded-2xl p-5">
        Sin permisos de administrador.
      </article>
    );
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <form
          onSubmit={createUser}
          className="surface grid gap-3 rounded-2xl p-5 md:grid-cols-2"
        >
          <h2 className="display-title col-span-full text-xl font-semibold">
            Crear usuario local
          </h2>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="soft-input px-3 py-2"
            placeholder="Nombre"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="soft-input px-3 py-2"
            placeholder="correo@empresa.com"
          />
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="soft-input px-3 py-2"
            placeholder="Contraseña"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as ManagedRole)}
            className="soft-input px-3 py-2"
          >
            <option value="MEMBER">Contador</option>
            <option value="LEADER">Lider</option>
            <option value="ADMIN">Administrador</option>
          </select>
          {role !== "ADMIN" ? (
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="soft-input px-3 py-2"
            >
              <option value="">Sin grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          ) : null}
          {role === "MEMBER" ? (
            <select
              value={leaderId}
              onChange={(event) => setLeaderId(event.target.value)}
              className="soft-input px-3 py-2"
            >
              <option value="">Sin lider</option>
              {leaders
                .filter((leader) => !groupId || leader.group_id === groupId)
                .map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
            </select>
          ) : null}
          <button className="rounded-xl bg-[#3641f5] px-4 py-2 font-medium text-white">
            Crear usuario
          </button>
        </form>
        <form
          onSubmit={createGroup}
          className="surface grid content-start gap-3 rounded-2xl p-5"
        >
          <h2 className="display-title text-xl font-semibold">Nuevo grupo</h2>
          <input
            required
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            className="soft-input px-3 py-2"
            placeholder="Ej. Grupo Fiscal Norte"
          />
          <button className="rounded-xl border border-[var(--line)] px-4 py-2 font-medium">
            Crear grupo
          </button>
        </form>
      </div>
      <div className="surface overflow-auto rounded-2xl p-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Grupo</th>
              <th>Lider</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="py-3">{item.name}</td>
                <td>{item.email}</td>
                <td>{item.role}</td>
                <td>
                  {item.group_id
                    ? (groupsById.get(item.group_id)?.name ?? "-")
                    : "-"}
                </td>
                <td>
                  {item.leader_id
                    ? (usersById.get(item.leader_id)?.name ?? "-")
                    : "-"}
                </td>
                <td>{item.is_active ? "Activo" : "Inactivo"}</td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 font-medium"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingUser ? (
        <form
          onSubmit={updateUser}
          className="surface grid gap-3 rounded-2xl p-5 md:grid-cols-2"
        >
          <h2 className="display-title col-span-full text-xl font-semibold">
            Editar usuario: {editingUser.email ?? editingUser.name}
          </h2>
          <input
            required
            value={editingName}
            onChange={(event) => setEditingName(event.target.value)}
            className="soft-input px-3 py-2"
            placeholder="Nombre"
          />
          <select
            value={editingRole}
            onChange={(event) =>
              setEditingRole(event.target.value as ManagedRole)
            }
            className="soft-input px-3 py-2"
          >
            <option value="MEMBER">Contador</option>
            <option value="LEADER">Lider</option>
            <option value="ADMIN">Administrador</option>
          </select>
          {editingRole !== "ADMIN" ? (
            <select
              value={editingGroupId}
              onChange={(event) => setEditingGroupId(event.target.value)}
              className="soft-input px-3 py-2"
            >
              <option value="">Sin grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          ) : null}
          {editingRole === "MEMBER" ? (
            <select
              value={editingLeaderId}
              onChange={(event) => setEditingLeaderId(event.target.value)}
              className="soft-input px-3 py-2"
            >
              <option value="">Sin lider</option>
              {leaders
                .filter(
                  (leader) =>
                    leader.id !== editingUser.id &&
                    (!editingGroupId || leader.group_id === editingGroupId),
                )
                .map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
            </select>
          ) : null}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={editingIsActive}
              onChange={(event) => setEditingIsActive(event.target.checked)}
            />
            Usuario activo
          </label>
          <div className="col-span-full flex flex-wrap gap-3">
            <button className="rounded-xl bg-[#3641f5] px-4 py-2 font-medium text-white">
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-xl border border-[var(--line)] px-4 py-2 font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
