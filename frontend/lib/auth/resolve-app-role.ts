import { type AppRole, parseAppRole } from "@/lib/rbac/app-role"
import { type NextRequest } from "next/server"

/**
 * Reads app role from Clerk session claims (customize session token in Clerk to include app_role).
 */
export function appRoleFromClerkSessionClaims(
  claims: Record<string, unknown> | null | undefined,
): AppRole {
  if (!claims) return "staff"
  const c = claims as {
    app_role?: string
    publicMetadata?: { app_role?: string }
    metadata?: { app_role?: string }
  }
  return parseAppRole(
    c.app_role ?? c.publicMetadata?.app_role ?? c.metadata?.app_role,
  )
}

export function appRoleFromMock(request: NextRequest): AppRole {
  const cookie = request.cookies.get("app_role")?.value
  const header = request.headers.get("x-mock-app-role")
  const env =
    process.env.MOCK_APP_ROLE ||
    process.env.NEXT_PUBLIC_MOCK_APP_ROLE ||
    "staff"
  return parseAppRole(cookie ?? header ?? env)
}
