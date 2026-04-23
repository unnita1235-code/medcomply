/**
 * Public env surface for the app. All secrets use NEXT_PUBLIC_ only for client-safe
 * values; service keys must stay on the server (FastAPI) or in server components.
 */
export type AuthProvider = "clerk" | "supabase" | "mock"

export function getAuthProvider(): AuthProvider {
  const v = process.env.NEXT_PUBLIC_AUTH_PROVIDER
  if (v === "clerk" || v === "supabase") return v
  return "mock"
}

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
}
