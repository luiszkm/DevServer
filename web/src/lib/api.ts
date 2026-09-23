import type { ApiErrorBody } from "./types";

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ApiErrorBody["error"] | null };

/** Calls the same-origin api. Network failures reject; HTTP errors resolve with ok=false. */
export async function api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (res.ok) return { ok: true, status: res.status, data: body as T };
  return { ok: false, status: res.status, error: (body as ApiErrorBody | null)?.error ?? null };
}

export function post<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}
