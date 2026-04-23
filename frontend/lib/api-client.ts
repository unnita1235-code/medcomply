import { getApiBaseUrl } from "@/lib/env"

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type Ok<T> = { ok: true; data: T }
type Err = { ok: false; error: ApiError }
export type ApiResult<T> = Ok<T> | Err

/**
 * Server or client: typed fetch to the FastAPI backend. Throwing `ApiError` in RSC
 * surfaces the route `error.tsx` error boundary. On the client, handle `ok: false` or
 * rethrow in render to trigger an error boundary.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const url = `${getApiBaseUrl().replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
  try {
    const isServer = typeof window === "undefined"
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      ...(isServer ? { next: { revalidate: 0 } } : {}),
    } as RequestInit)
    const text = await res.text()
    if (!res.ok) {
      return {
        ok: false,
        error: new ApiError(text || res.statusText, res.status),
      }
    }
    if (!text) return { ok: true, data: {} as T }
    return { ok: true, data: JSON.parse(text) as T }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    return { ok: false, error: new ApiError(err.message, 0) }
  }
}

/**
 * RSC / server actions: throw on error so the nearest error boundary can render.
 */
export async function apiFetchOrThrow<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await apiFetch<T>(path, init)
  if (r.ok) return r.data
  throw r.error
}
