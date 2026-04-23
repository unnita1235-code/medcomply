import { apiFetchOrThrow } from "@/lib/api-client"

export const dynamic = "force-dynamic"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type DocumentRow = {
  id: string
  title: string
  status: string
  organization_id: string
}

type ListResponse = { items: DocumentRow[] }

export default async function DocumentsPage() {
  const data = await apiFetchOrThrow<ListResponse>("/v1/documents")
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Documents</h2>
        <p className="text-muted-foreground">
          Evidence and policy documents, scoped by organization and role.
        </p>
      </div>
      <div className="grid gap-3">
        {data.items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No rows yet</CardTitle>
              <CardDescription>
                Run Supabase migrations and seed data, or create documents via the
                API.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          data.items.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                  {doc.title}
                </CardTitle>
                <Badge variant="outline">{doc.status}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Org {doc.organization_id}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
