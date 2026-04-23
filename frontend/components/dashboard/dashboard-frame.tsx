"use client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { usePathname } from "next/navigation"
import { type ReactNode, useMemo } from "react"

const titles: { prefix: string; title: string }[] = [
  { prefix: "/dashboard/settings", title: "Settings" },
  { prefix: "/dashboard/compliance", title: "Compliance" },
  { prefix: "/documents", title: "Documents" },
  { prefix: "/admin", title: "Admin" },
  { prefix: "/doctor", title: "Doctor" },
  { prefix: "/staff", title: "Staff" },
  { prefix: "/unauthorized", title: "Unauthorized" },
  { prefix: "/compliance-analysis", title: "Compliance Analysis" },
  { prefix: "/dashboard", title: "Overview" },
]

function titleForPath(path: string) {
  const hit = titles.find((t) => path === t.prefix || path.startsWith(`${t.prefix}/`))
  return hit?.title ?? "Workspace"
}

export function DashboardFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const title = useMemo(() => titleForPath(pathname), [pathname])
  return <DashboardShell title={title}>{children}</DashboardShell>
}
