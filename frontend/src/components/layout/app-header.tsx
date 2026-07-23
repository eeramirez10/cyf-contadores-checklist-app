"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AppHeaderProps = {
  title: string;
  description: string;
  onToggleSidebar: () => void;
};

type ProfileRow = {
  name: string;
};

type CompanyRow = {
  id: string;
  name: string;
  member_id: string;
};

const currentMonthKey = (): string => new Date().toISOString().slice(0, 7);

const userInitials = (name: string, email: string): string => {
  const base = name.trim() || email.trim() || "U";
  const parts = base.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const iconButtonClass =
  "flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100";

export function AppHeader({ title, description, onToggleSidebar }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string>("Usuario");
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [commandOpen, setCommandOpen] = useState<boolean>(false);
  const [commandQuery, setCommandQuery] = useState<string>("");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);

  const monthFromQuery = searchParams.get("month");
  const monthValue = monthFromQuery && /^\d{4}-\d{2}$/.test(monthFromQuery)
    ? monthFromQuery
    : currentMonthKey();

  const setUrlQuery = (entries: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(entries)) {
      if (!value) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (!supabase) {
      return;
    }
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (!data.session) {
        return;
      }
      const fallbackName =
        (data.session.user.user_metadata?.full_name as string | undefined) ??
        data.session.user.email?.split("@")[0] ??
        "Usuario";
      setDisplayName(fallbackName);
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (profile) {
        setDisplayName((profile as ProfileRow).name);
      }
    };
    void load();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) {
      return;
    }
    const loadCompanies = async () => {
      const { data } = await supabase
        .from("clients")
        .select("id,name,member_id")
        .eq("is_active", true)
        .order("name", { ascending: true });
      setCompanies((data ?? []) as CompanyRow[]);
    };
    void loadCompanies();
  }, [session, supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleCommandShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.code === "Space") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
      }
    };

    document.addEventListener("keydown", handleCommandShortcut);
    return () => {
      document.removeEventListener("keydown", handleCommandShortcut);
    };
  }, []);

  useEffect(() => {
    if (!commandOpen) {
      return;
    }
    const timer = window.setTimeout(() => {
      commandInputRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [commandOpen]);

  const filteredCompanies = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) {
      return companies.slice(0, 10);
    }
    return companies.filter((company) => company.name.toLowerCase().includes(query)).slice(0, 18);
  }, [commandQuery, companies]);

  const userEmail = session?.user.email ?? "sin-correo@demo.local";
  const avatarUrl = (session?.user.user_metadata?.avatar_url as string | undefined) ?? "";
  const initials = userInitials(displayName, userEmail);

  const onSignOut = async () => {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/login");
  };

  const openCompanyFromCommand = (companyId: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", monthValue);
    next.set("clientId", companyId);
    setCommandOpen(false);
    setCommandQuery("");
    router.push(`/empresas?${next.toString()}`);
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="flex h-[78px] items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Abrir o cerrar sidebar"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100"
            >
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <div>
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="hidden items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 md:flex">
              <span className="text-xs font-medium text-gray-500">Mes</span>
              <input
                type="month"
                value={monthValue}
                onChange={(event) => {
                  setUrlQuery({ month: event.target.value || currentMonthKey() });
                }}
                className="border-none bg-transparent text-sm text-gray-700 outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className={iconButtonClass}
              aria-label="Buscar"
              title="Buscar (Cmd/Ctrl + Space)"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11.5 4.5C15.37 4.5 18.5 7.63 18.5 11.5C18.5 13.17 17.91 14.71 16.93 15.91L20 18.98L18.98 20L15.91 16.93C14.71 17.91 13.17 18.5 11.5 18.5C7.63 18.5 4.5 15.37 4.5 11.5C4.5 7.63 7.63 4.5 11.5 4.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </button>

            <button type="button" className={`${iconButtonClass} relative`} aria-label="Notificaciones">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3.8C8.9 3.8 6.4 6.3 6.4 9.4V12.2C6.4 12.8 6.1 13.8 5.7 14.3L4.5 16.1C4 16.9 4.6 18 5.6 18H18.4C19.4 18 20 16.9 19.5 16.1L18.3 14.3C17.9 13.8 17.6 12.8 17.6 12.2V9.4C17.6 6.3 15.1 3.8 12 3.8Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path d="M9.9 20.2C10.5 20.8 11.2 21.1 12 21.1C12.8 21.1 13.5 20.8 14.1 20.2" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <span className="absolute right-3 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-orange-400" />
            </button>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="flex items-center gap-3 rounded-full border border-transparent px-1 py-1 transition hover:bg-gray-100"
              >
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-700">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </span>
                <span className="hidden text-[32px] leading-none text-gray-700 md:block">⌃</span>
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[320px] rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_20px_30px_-12px_rgba(16,24,40,0.22)]">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-gray-800">{displayName}</p>
                    <p className="mt-1 text-base text-gray-500">{userEmail}</p>
                  </div>

                  <div className="mt-6 grid gap-2">
                    <Link href="/usuario" className="flex items-center gap-3 rounded-xl px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100">
                      <span className="text-gray-500">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M4 20C5.8 16.8 8.7 15 12 15C15.3 15 18.2 16.8 20 20" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </span>
                      <span>Edit profile</span>
                    </Link>
                    <Link href="/usuario#settings" className="flex items-center gap-3 rounded-xl px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100">
                      <span className="text-gray-500">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <path d="M12 8.6A3.4 3.4 0 1 0 12 15.4A3.4 3.4 0 1 0 12 8.6Z" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M19.2 13.2L20.7 12L19.2 10.8L18.9 8.9L17 8.6L15.8 7.1L14 7.7L12 6.9L10 7.7L8.2 7.1L7 8.6L5.1 8.9L4.8 10.8L3.3 12L4.8 13.2L5.1 15.1L7 15.4L8.2 16.9L10 16.3L12 17.1L14 16.3L15.8 16.9L17 15.4L18.9 15.1L19.2 13.2Z" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                      </span>
                      <span>Account settings</span>
                    </Link>
                    <a href="mailto:soporte@demo.local" className="flex items-center gap-3 rounded-xl px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100">
                      <span className="text-gray-500">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M12 10V16" stroke="currentColor" strokeWidth="1.8" />
                          <circle cx="12" cy="7" r="1" fill="currentColor" />
                        </svg>
                      </span>
                      <span>Support</span>
                    </a>
                  </div>

                  <div className="my-4 border-t border-gray-200" />

                  <button
                    type="button"
                    onClick={() => void onSignOut()}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-lg font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <span className="text-gray-500">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M15.5 7V5.8C15.5 4.8 14.7 4 13.7 4H6.8C5.8 4 5 4.8 5 5.8V18.2C5 19.2 5.8 20 6.8 20H13.7C14.7 20 15.5 19.2 15.5 18.2V17" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M12 12H20" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M17 9L20 12L17 15" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </span>
                    <span>Sign out</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {commandOpen ? (
        <div className="fixed inset-0 z-[70] bg-[#1018288a] backdrop-blur-sm" onClick={() => setCommandOpen(false)}>
          <div className="mx-auto mt-[11vh] w-full max-w-2xl px-4" onClick={(event) => event.stopPropagation()}>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_22px_36px_-12px_rgba(16,24,40,0.32)]">
              <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
                <svg className="text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M11.5 4.5C15.37 4.5 18.5 7.63 18.5 11.5C18.5 13.17 17.91 14.71 16.93 15.91L20 18.98L18.98 20L15.91 16.93C14.71 17.91 13.17 18.5 11.5 18.5C7.63 18.5 4.5 15.37 4.5 11.5C4.5 7.63 7.63 4.5 11.5 4.5Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
                <input
                  ref={commandInputRef}
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  placeholder="Buscar empresa..."
                  className="h-10 w-full border-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-400"
                />
                <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-500">esc</span>
              </div>

              <div className="max-h-[420px] overflow-auto p-2">
                {filteredCompanies.length ? (
                  filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => openCompanyFromCommand(company.id)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-gray-100"
                    >
                      <span className="text-sm font-medium text-gray-800">{company.name}</span>
                      <span className="text-xs text-gray-500">Abrir empresa</span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-6 text-center text-sm text-gray-500">Sin resultados.</p>
                )}
              </div>

              <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
                Atajo: Cmd/Ctrl + Space
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
