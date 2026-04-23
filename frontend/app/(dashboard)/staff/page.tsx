import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function StaffHomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Staff</h2>
      <p className="text-muted-foreground text-sm">
        Default landing for <code className="font-mono">app_role = staff</code>. All roles
        can access this area.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operations</CardTitle>
          <CardDescription>
            Scheduling, intake, and non-clinical compliance tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use with least-privilege Supabase RLS and FastAPI checks.
        </CardContent>
      </Card>
    </div>
  )
}
