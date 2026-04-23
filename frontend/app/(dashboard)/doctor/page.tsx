import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function DoctorHomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Doctor</h2>
      <p className="text-muted-foreground text-sm">
        Open to <code className="font-mono">admin</code> and{" "}
        <code className="font-mono">doctor</code> app roles.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clinical workspace</CardTitle>
          <CardDescription>
            Document review, orders, and PHI-appropriate workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Connect patient and document modules under your org scope.
        </CardContent>
      </Card>
    </div>
  )
}
