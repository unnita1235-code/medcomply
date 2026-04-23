import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server"
import {
  appRoleFromClerkSessionClaims,
  appRoleFromMock,
} from "@/lib/auth/resolve-app-role"
import {
  type AppRole,
  roleDefaultPath,
  roleMayAccessPath,
} from "@/lib/rbac/app-role"
import { getSupabaseSessionWithRole } from "@/lib/supabase/session-with-role"
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/unauthorized",
])

function isDashboardRoot(pathname: string) {
  const p = pathname.replace(/\/$/, "") || "/"
  return p === "/dashboard"
}

function setRoleCookie(res: NextResponse, role: string) {
  res.cookies.set("app_role", role, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}

function redirectPreservingCookies(
  from: NextResponse,
  targetPath: string,
  request: NextRequest,
  appRole: string,
) {
  const r = NextResponse.redirect(new URL(targetPath, request.url))
  from.cookies.getAll().forEach((c) => r.cookies.set(c.name, c.value))
  setRoleCookie(r, appRole)
  return r
}

const clerk = clerkMiddleware(
  async (auth, request: NextRequest) => {
    if (isPublicRoute(request)) {
      return
    }
    await auth.protect()
    const { userId, sessionClaims } = await auth()
    if (!userId) {
      return
    }
    const role = appRoleFromClerkSessionClaims(
      sessionClaims as Record<string, unknown> | null,
    ) as AppRole
    const pathname = request.nextUrl.pathname
    if (!roleMayAccessPath(role, pathname)) {
      const r = NextResponse.redirect(new URL("/unauthorized", request.url))
      return setRoleCookie(r, role)
    }
    if (isDashboardRoot(pathname)) {
      const r = NextResponse.redirect(
        new URL(roleDefaultPath(role), request.url),
      )
      return setRoleCookie(r, role)
    }
    const res = NextResponse.next()
    return setRoleCookie(res, role)
  },
)

export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "mock"
  const hasClerk =
    provider === "clerk" && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (provider === "supabase" && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { response, userId, appRole } = await getSupabaseSessionWithRole(
      request,
    )
    if (isPublicRoute(request)) {
      return response
    }
    if (!userId) {
      return redirectPreservingCookies(
        response,
        "/sign-in",
        request,
        appRole,
      )
    }
    const pathname = request.nextUrl.pathname
    if (!roleMayAccessPath(appRole, pathname)) {
      return redirectPreservingCookies(response, "/unauthorized", request, appRole)
    }
    if (isDashboardRoot(pathname)) {
      return redirectPreservingCookies(
        response,
        roleDefaultPath(appRole),
        request,
        appRole,
      )
    }
    return setRoleCookie(response, appRole)
  }

  if (hasClerk) {
    return clerk(request, event)
  }

  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  const appRole = appRoleFromMock(request) as AppRole
  const pathname = request.nextUrl.pathname
  if (!roleMayAccessPath(appRole, pathname)) {
    return setRoleCookie(
      NextResponse.redirect(new URL("/unauthorized", request.url)),
      appRole,
    )
  }
  if (isDashboardRoot(pathname)) {
    return setRoleCookie(
      NextResponse.redirect(
        new URL(roleDefaultPath(appRole), request.url),
      ),
      appRole,
    )
  }
  return setRoleCookie(NextResponse.next(), appRole)
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
