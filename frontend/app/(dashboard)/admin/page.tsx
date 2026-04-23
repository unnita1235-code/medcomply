import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Admin</h2>
      <p className="text-muted-foreground text-sm">
        Only users with <code className="font-mono">app_role = admin</code> can open this
        route. Middleware enforces this using{" "}
        <code className="font-mono">public.users.app_role</code> (Supabase) or Clerk
        session claims.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenant & access</CardTitle>
          <CardDescription>
            Manage org settings, integrations, and staff role assignments.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Wire this area to your admin APIs and Supabase RLS policies.
        </CardContent>
      </Card>
    </div>
  )
}
