"use client"

import { roleDefaultPath, type AppRole, parseAppRole } from "@/lib/rbac/app-role"
import Link from "next/link"
import { LayoutDashboard } from "lucide-react"
import { useEffect, useState } from "react"

function readRoleFromCookie(): AppRole {
  if (typeof document === "undefined") return "staff"
  const m = document.cookie.match(/(?:^|; )app_role=([^;]+)/)
  if (m?.[1]) {
    return parseAppRole(decodeURIComponent(m[1]))
  }
  return parseAppRole(process.env.NEXT_PUBLIC_MOCK_APP_ROLE)
}

export function RoleHomeLink() {
  const [href, setHref] = useState("/staff")
  useEffect(() => {
    setHref(roleDefaultPath(readRoleFromCookie()))
  }, [])
  return (
    <Link href={href}>
      <LayoutDashboard />
      <span>My workspace</span>
    </Link>
  )
}
