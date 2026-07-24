"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  type BackendUser,
  restoreBackendSession,
  signInWithBackend,
  signOutFromBackend,
} from "@/lib/backend-auth";

type AuthContextValue = {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  status: "loading" | "authenticated" | "anonymous";
  user: BackendUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [user, setUser] = useState<BackendUser | null>(null);

  useEffect(() => {
    let active = true;

    void restoreBackendSession().then((nextUser) => {
      if (!active) {
        return;
      }
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "anonymous");
    });

    return () => {
      active = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const nextUser = await signInWithBackend(email, password);
    setUser(nextUser);
    setStatus("authenticated");
  };

  const signOut = async () => {
    await signOutFromBackend();
    setUser(null);
    setStatus("anonymous");
  };

  return (
    <AuthContext.Provider value={{ signIn, signOut, status, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
