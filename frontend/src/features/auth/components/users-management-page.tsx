"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getBackendAccessToken } from "@/lib/backend-auth";
import { env } from "@/lib/env";

type ManagedUser = { id: string; name: string; email: string | null; role: string; is_active: boolean };

export function UsersManagementPage() {
  const { status, user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("MEMBER");

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const token = getBackendAccessToken();
    const response = await fetch(`${env.apiUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((payload as { message?: string }).message ?? "No se pudo completar la solicitud.");
    return payload;
  }, []);

  const load = useCallback(async () => {
    if (status !== "authenticated" || user?.role !== "ADMIN") return;
    setLoading(true);
    try { const data = await request("/admin/users"); setUsers((data as { users: ManagedUser[] }).users); }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cargar usuarios."); }
    finally { setLoading(false); }
  }, [request, status, user?.role]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await request("/admin/users", { method: "POST", body: JSON.stringify({ name, email, password, role }) });
      setName(""); setEmail(""); setPassword(""); setRole("MEMBER");
      toast.success("Usuario local creado.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo crear usuario."); }
  };

  if (status === "loading" || loading) return <article className="surface rounded-2xl p-5 text-sm text-gray-600">Cargando usuarios...</article>;
  if (user?.role !== "ADMIN") return <article className="surface rounded-2xl p-5">Sin permisos de administrador.</article>;

  return <section className="grid gap-6">
    <form onSubmit={createUser} className="surface grid gap-3 rounded-2xl p-5 md:grid-cols-2">
      <h2 className="display-title col-span-full text-xl font-semibold">Crear usuario local</h2>
      <input required value={name} onChange={(event) => setName(event.target.value)} className="soft-input px-3 py-2" placeholder="Nombre" />
      <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="soft-input px-3 py-2" placeholder="correo@empresa.com" />
      <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="soft-input px-3 py-2" placeholder="Contraseña" />
      <select value={role} onChange={(event) => setRole(event.target.value)} className="soft-input px-3 py-2"><option value="MEMBER">Contador</option><option value="LEADER">Lider</option><option value="ADMIN">Administrador</option></select>
      <button className="rounded-xl bg-[#3641f5] px-4 py-2 font-medium text-white">Crear usuario</button>
    </form>
    <div className="surface overflow-auto rounded-2xl p-5"><table className="w-full text-sm"><thead><tr className="text-left text-gray-500"><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th></tr></thead><tbody>{users.map((item) => <tr key={item.id} className="border-t"><td className="py-3">{item.name}</td><td>{item.email}</td><td>{item.role}</td><td>{item.is_active ? "Activo" : "Inactivo"}</td></tr>)}</tbody></table></div>
  </section>;
}
