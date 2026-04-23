-- Append-only audit trail for server-side AI compliance runs (sync + SSE).
-- The API inserts via service role; enable RLS with no policies for public roles if you only use service key.

create table if not exists public.ai_analysis_audit (
  id uuid primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid,
  app_role text not null,
  file_name text not null,
  run_at timestamptz not null,
  violation_count int not null default 0,
  avg_confidence double precision,
  chroma_collection text,
  client_ip text,
  result_summary text
);

create index if not exists ai_analysis_audit_org_run_at
  on public.ai_analysis_audit (organization_id, run_at desc);

alter table public.ai_analysis_audit enable row level security;

-- Optional: org members can read their org's audit rows (JWT via PostgREST as authenticated user)
create policy "ai_analysis_audit_select_org"
  on public.ai_analysis_audit for select
  using (public.is_org_member(organization_id, auth.uid()));
