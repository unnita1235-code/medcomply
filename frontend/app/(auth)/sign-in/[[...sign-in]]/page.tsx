import { SignIn } from "@clerk/nextjs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SignInPage() {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "mock"
  const hasClerk =
    provider === "clerk" && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (hasClerk) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Clerk is not configured. For production, set{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_AUTH_PROVIDER=clerk</code>{" "}
            and your Clerk keys. Alternatively use Supabase Auth.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/dashboard">Continue to dashboard (mock)</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
