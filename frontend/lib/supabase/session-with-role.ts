import { parseAppRole, type AppRole } from "@/lib/rbac/app-role"
import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

export type SupabaseMiddlewareState = {
  response: NextResponse
  userId: string | null
  appRole: AppRole
}

/**
 * Refreshes the Supabase session and loads public.users.app_role for the current user.
 */
export async function getSupabaseSessionWithRole(
  request: NextRequest,
): Promise<SupabaseMiddlewareState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return { response: NextResponse.next({ request }), userId: null, appRole: "staff" }
  }

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { response: supabaseResponse, userId: null, appRole: "staff" }
  }
  const { data, error } = await supabase
    .from("users")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle()
  if (error) {
    console.error("users.app_role", error.message)
  }
  const appRole = parseAppRole((data as { app_role?: string } | null)?.app_role)
  supabaseResponse.cookies.set("app_role", appRole, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  })
  return { response: supabaseResponse, userId: user.id, appRole }
}
