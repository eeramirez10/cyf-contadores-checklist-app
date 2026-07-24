"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";

type PanelAuthGuardProps = {
  children: React.ReactNode;
};

export function PanelAuthGuard({ children }: PanelAuthGuardProps) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "loading") {
    return (
      <main className="app-grid-bg min-h-screen px-4 py-10 md:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--foreground-soft)]">
          Verificando sesion...
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
