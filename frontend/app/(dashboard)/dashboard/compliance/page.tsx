import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function CompliancePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Compliance</h2>
        <p className="text-muted-foreground">
          Control frameworks and checkpoints (wire to your policies and audits).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">HIPAA-oriented controls</CardTitle>
          <CardDescription>
            Map each control to owners and evidence stored under Documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Protect PHI: use least-privilege RBAC, audit logs, and signed URLs for
          files in Supabase Storage (add in a follow-up).
        </CardContent>
      </Card>
    </div>
  )
}
