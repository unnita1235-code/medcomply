/**
 * App-level roles (Supabase public.users.app_role, Clerk publicMetadata, mock env).
 * Enum values match the database: admin | doctor | staff
 */
export type AppRole = "admin" | "doctor" | "staff"

const APP_ROLES: readonly AppRole[] = ["admin", "doctor", "staff"] as const

export function isAppRole(x: string | null | undefined): x is AppRole {
  return x !== undefined && x !== null && (APP_ROLES as readonly string[]).includes(x)
}

export function parseAppRole(x: string | null | undefined): AppRole {
  if (x && isAppRole(x)) return x
  return "staff"
}

/**
 * Can this role open a path? /admin: Admin only. /doctor: Admin and Doctor. /staff: all.
 */
export function roleMayAccessPath(appRole: AppRole, path: string): boolean {
  if (path === "/unauthorized") return true
  if (path.startsWith("/admin")) return appRole === "admin"
  if (path.startsWith("/doctor")) {
    return appRole === "admin" || appRole === "doctor"
  }
  if (path.startsWith("/staff")) return true
  return true
}

/** /dashboard (legacy overview) -> role home */
export function roleDefaultPath(role: AppRole): string {
  if (role === "admin") return "/admin"
  if (role === "doctor") return "/doctor"
  return "/staff"
}
