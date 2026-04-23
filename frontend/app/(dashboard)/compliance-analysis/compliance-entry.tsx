"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const ComplianceWorkspace = dynamic(
  () =>
    import("@/components/compliance-analysis/compliance-workspace").then(
      (m) => ({ default: m.ComplianceWorkspace }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[min(80vh,640px)] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-500">
        <Loader2 className="size-8 animate-spin" />
      </div>
    ),
  },
)

export function ComplianceEntry() {
  return <ComplianceWorkspace />
}
