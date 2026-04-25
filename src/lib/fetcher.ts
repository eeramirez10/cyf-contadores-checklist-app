export const fetchJson = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    const message = (payload as { error?: string }).error ?? "Request failed";
    throw new Error(message);
  }
  return payload as T;
};
