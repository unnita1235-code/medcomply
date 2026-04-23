import { DashboardFrame } from "@/components/dashboard/dashboard-frame"
import { type ReactNode } from "react"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardFrame>{children}</DashboardFrame>
}
