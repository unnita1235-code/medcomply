import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Organization profile and integration keys (server-side only in
          production).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
          <CardDescription>Display name for the current workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="org">Name</Label>
          <Input id="org" placeholder="Acme Clinical" disabled />
        </CardContent>
      </Card>
    </div>
  )
}
