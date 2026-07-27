"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { PanelLoader } from "@/components/layout/panel-loader";

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
    return <PanelLoader fullScreen />;
  }

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
