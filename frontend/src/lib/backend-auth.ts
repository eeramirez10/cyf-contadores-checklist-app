import { env } from "@/lib/env";

export type BackendUser = {
  id: string;
  email: string | null;
  name: string;
  role: string;
};

type AccessTokenResponse = {
  accessToken: string;
};

let accessToken: string | null = null;

export const getBackendAccessToken = (): string | null => accessToken;

const apiUrl = (path: string): string => `${env.apiUrl}${path}`;

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & {
    message?: string | string[];
  };

  if (!response.ok) {
    const message = Array.isArray(payload.message)
      ? payload.message.join(", ")
      : payload.message ?? "No se pudo completar la solicitud.";
    throw new Error(message);
  }

  return payload;
}

export async function backendFetch<T>(
  path: string,
  init: RequestInit = {},
  retryAfterRefresh = true,
): Promise<T> {
  if (!accessToken) {
    throw new Error("La sesion no esta inicializada.");
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
    credentials: "include",
  });

  if (response.status === 401 && retryAfterRefresh) {
    await requestAccessToken("/auth/refresh");
    return backendFetch<T>(path, init, false);
  }

  return parseResponse<T>(response);
}

async function requestAccessToken(
  path: "/auth/login" | "/auth/refresh",
  body?: { email: string; password: string },
): Promise<string> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  const payload = await parseResponse<AccessTokenResponse>(response);
  accessToken = payload.accessToken;
  return payload.accessToken;
}

export async function getBackendUser(): Promise<BackendUser> {
  if (!accessToken) {
    throw new Error("La sesion no esta inicializada.");
  }

  const response = await fetch(apiUrl("/auth/me"), {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  return parseResponse<BackendUser>(response);
}

export async function signInWithBackend(
  email: string,
  password: string,
): Promise<BackendUser> {
  await requestAccessToken("/auth/login", { email, password });
  return getBackendUser();
}

export async function restoreBackendSession(): Promise<BackendUser | null> {
  try {
    await requestAccessToken("/auth/refresh");
    return await getBackendUser();
  } catch {
    accessToken = null;
    return null;
  }
}

export async function signOutFromBackend(): Promise<void> {
  await fetch(apiUrl("/auth/logout"), {
    method: "POST",
    credentials: "include",
  });
  accessToken = null;
}
