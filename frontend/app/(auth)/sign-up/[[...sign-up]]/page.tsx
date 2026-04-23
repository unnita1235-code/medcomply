import { SignUp } from "@clerk/nextjs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SignUpPage() {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "mock"
  const hasClerk =
    provider === "clerk" && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (hasClerk) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Wire Clerk or Supabase Auth via environment variables, then return
            here for hosted sign-up.
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
