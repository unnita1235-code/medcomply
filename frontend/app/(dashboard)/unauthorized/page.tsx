import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            Your role does not allow this area. App roles are Admin, Doctor, and Staff
            (see <code className="font-mono text-xs">public.users.app_role</code> in
            Supabase).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/staff">Staff workspace</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
