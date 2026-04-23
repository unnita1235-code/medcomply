"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ReactNode } from "react"

export function AppProviders({ children }: { children: ReactNode }) {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "mock"
  const canUseClerk =
    provider === "clerk" && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  if (canUseClerk) {
    return (
      <ClerkProvider
        publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      >
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </ClerkProvider>
    )
  }
  return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
}
