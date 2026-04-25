import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="app-grid-bg min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-md rounded-2xl border border-[var(--line)] bg-white p-6">
        <p className="status-pill text-xs text-[var(--foreground-soft)]">Registro</p>
        <h1 className="display-title mt-2 text-3xl font-semibold">Registro deshabilitado</h1>
        <p className="mt-2 text-sm text-[var(--foreground-soft)]">
          El alta de cuentas la realiza un administrador desde la seccion Usuarios.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-xl bg-[linear-gradient(180deg,#4f67ff_0%,#3641f5_100%)] px-4 py-2 text-sm font-medium text-white"
        >
          Ir a login
        </Link>
      </div>
    </main>
  );
}
