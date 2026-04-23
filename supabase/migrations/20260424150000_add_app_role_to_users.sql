-- App-level RBAC on the profile table (public.users): Admin, Doctor, Staff.
-- Distinct from organization_members.org_role (tenant ops roles).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role' and typnamespace = (select oid from pg_namespace where nspname = 'public')) then
    create type public.app_role as enum ('admin', 'doctor', 'staff');
  end if;
end$$;

alter table public.users
  add column if not exists app_role public.app_role not null default 'staff';

create index if not exists users_app_role_idx on public.users (app_role);

comment on column public.users.app_role is 'Application RBAC: admin, doctor, or staff (profile-level).';

-- Allow users to read their own app_role; updates typically via service role or admin
-- (Tighten write policies in production if clients should not PATCH app_role directly.)
