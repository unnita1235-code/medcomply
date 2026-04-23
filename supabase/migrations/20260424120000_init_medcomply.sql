-- MedComply: Organizations, Users, Documents, and RBAC (organization role per member).
-- Apply with: supabase db push   or   supabase migration up

create extension if not exists "pgcrypto";

create type public.org_role as enum (
  'org_admin',
  'compliance_officer',
  'analyst',
  'viewer'
);

-- Organizations (tenants)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- App users, aligned with Supabase auth.users
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

-- Many-to-many membership + RBAC role (mandatory for authorization in RLS and API)
create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role public.org_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  title text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create index if not exists documents_org_idx on public.documents (organization_id);
create index if not exists members_user_idx on public.organization_members (user_id);

-- Keep auth.users in sync with public.users (Supabase Auth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Row Level Security
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.organization_members enable row level security;
alter table public.documents enable row level security;

-- Helper: is caller a member of an org
create or replace function public.is_org_member(o_id uuid, u_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = o_id
      and m.user_id = u_id
  );
$$;

-- organizations: read if member
create policy "org_select_member"
  on public.organizations for select
  using (public.is_org_member(id, auth.uid()));

-- users: read self, or people in the same org (admin flows may refine this)
create policy "users_self"
  on public.users for select
  using (id = auth.uid());

-- organization_members: read rows for orgs you belong to
create policy "members_select"
  on public.organization_members for select
  using (user_id = auth.uid() or public.is_org_member(organization_id, auth.uid()));

-- documents: org members with read roles (viewer+ can read; writes require stricter app logic)
create policy "documents_select_member"
  on public.documents for select
  using (public.is_org_member(organization_id, auth.uid()));

create policy "documents_write_privileged"
  on public.documents for insert
  with check (
    public.is_org_member(organization_id, auth.uid())
    and exists (
      select 1
      from public.organization_members m
      where m.organization_id = organization_id
        and m.user_id = auth.uid()
        and m.role in ('org_admin', 'compliance_officer', 'analyst')
    )
  );

-- NOTE: Tighten policies (UPDATE/DELETE) and add storage policies for PHI in production.
