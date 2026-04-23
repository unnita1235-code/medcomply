import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Shield } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <header className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="size-5" />
          </div>
          <span className="font-semibold">MedComply</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-20">
        <p className="text-sm font-medium text-primary">Vertical SaaS</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Medical compliance, built in
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Organizations, user roles, and document traceability for regulated
          clinical workflows. Next.js, FastAPI, and Supabase with mandatory RBAC.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-up">Create account</Link>
          </Button>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Org & roles</CardTitle>
              <CardDescription>
                Multi-tenant orgs with permission levels enforced in the API and
                database (RLS).
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Map Clerk or Supabase Auth identities to the Users, Organizations, and
              Documents tables in Supabase.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Audit-ready</CardTitle>
              <CardDescription>
                Central place for policy docs and evidence, backed by the FastAPI
                service in `/backend`.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              All API access is expected to go through the typed client; segment
              error boundaries catch failures in the App Router.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
