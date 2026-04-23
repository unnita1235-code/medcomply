import { ApiHealthTile } from "@/components/bridge/api-health-tile"
import { getAuthProvider } from "@/lib/env"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Shield } from "lucide-react"

export default function DashboardHome() {
  const auth = getAuthProvider()
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {auth === "mock" && (
        <Alert>
          <Shield className="size-4" />
          <AlertTitle>Mock auth</AlertTitle>
          <AlertDescription>
            Set <code className="font-mono">NEXT_PUBLIC_AUTH_PROVIDER</code> to
            <code className="font-mono">clerk</code> or{" "}
            <code className="font-mono">supabase</code> and add keys to enable
            real sign-in. RBAC is enforced in FastAPI and Supabase RLS.
          </AlertDescription>
        </Alert>
      )}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">
          Medical compliance workspace — organizations, members, and documents.
        </p>
      </div>
      <ApiHealthTile />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RBAC</CardTitle>
            <CardDescription>
              Roles are enforced in the API layer and mirrored in Supabase
              policies.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">org_admin</Badge>
            <Badge variant="secondary">compliance_officer</Badge>
            <Badge variant="secondary">analyst</Badge>
            <Badge variant="outline">viewer</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data plane</CardTitle>
            <CardDescription>
              Supabase holds users, organizations, and documents tables with
              org-scoped RLS.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            See <code className="font-mono">/supabase/migrations</code> in the
            monorepo root.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
