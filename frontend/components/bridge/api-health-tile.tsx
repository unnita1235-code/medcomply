"use client"

import { apiFetch, type ApiError } from "@/lib/api-client"
import { useEffect, useState } from "react"
import { ClientErrorBoundary } from "./client-error-boundary"

type Health = { status: string; service: string }

function ThrowingHealthInner() {
  const [outcome, setOutcome] = useState<"load" | "ok" | "err">("load")
  const [err, setErr] = useState<ApiError | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const r = await apiFetch<Health>("/v1/healthz")
      if (cancelled) return
      if (r.ok) {
        setOutcome("ok")
        return
      }
      setErr(r.error)
      setOutcome("err")
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (outcome === "err" && err) {
    // Throw so parents using only an error boundary (without state UI) can catch.
    // ClientErrorBoundary above handles display for this block.
    throw err
  }

  if (outcome === "load") {
    return <p className="text-sm text-muted-foreground">Checking API…</p>
  }

  return <p className="text-sm text-emerald-600">API reachable (healthz OK)</p>
}

export function ApiHealthTile() {
  return (
    <ClientErrorBoundary>
      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Backend health (client call)</p>
        <p className="text-xs text-muted-foreground">GET /v1/healthz via lib/api-client</p>
        <div className="mt-2">
          <ThrowingHealthInner />
        </div>
      </div>
    </ClientErrorBoundary>
  )
}
