"use client"

import { RoleHomeLink } from "@/components/dashboard/role-home-link"
import {
  BarChart3,
  Briefcase,
  FileText,
  Shield,
  Settings,
  Stethoscope,
  UserCog,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const roleNav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Admin", icon: UserCog },
  { href: "/doctor", label: "Doctor", icon: Stethoscope },
  { href: "/staff", label: "Staff", icon: Briefcase },
]

export function AppSidebar() {
  const pathname = usePathname()
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">MedComply</span>
            <span className="text-xs text-muted-foreground">
              Medical compliance
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    ["/admin", "/doctor", "/staff"].some(
                      (p) => pathname === p || pathname.startsWith(`${p}/`),
                    )
                  }
                >
                  <RoleHomeLink />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/documents")}
                >
                  <Link href="/documents">
                    <FileText />
                    <span>Documents</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/compliance-analysis")}
                >
                  <Link href="/compliance-analysis">
                    <BarChart3 />
                    <span>Compliance analysis</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/dashboard/compliance")}
                >
                  <Link href="/dashboard/compliance">
                    <Shield />
                    <span>Compliance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/dashboard/settings")}
                >
                  <Link href="/dashboard/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>By role (RBAC)</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {roleNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                    }
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2 text-xs text-muted-foreground">
        App roles: Admin, Doctor, Staff (public.users.app_role) + API org roles.
      </SidebarFooter>
    </Sidebar>
  )
}
