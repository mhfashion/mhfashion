-- MH Fashion: Supabase Auth-backed admin roles.
-- Passwords are managed by Supabase Auth and are never stored in public tables.

do $$
begin
  create type public.app_role as enum ('super_admin', 'admin', 'post_admin', 'print_admin');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  role public.app_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_roles is 'Application roles for Supabase Auth users. Passwords remain in auth.users and are never stored here.';
comment on column public.user_roles.username is 'Admin-facing handle; authentication still uses the Supabase Auth email/password flow.';

create index if not exists user_roles_role_idx on public.user_roles(role);

alter table public.user_roles enable row level security;
revoke all on table public.user_roles from anon, authenticated;

drop policy if exists "Users can read their own admin role" on public.user_roles;
create policy "Users can read their own admin role"
  on public.user_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'super_admin'::public.app_role
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

create or replace function public.set_user_roles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_roles_updated_at on public.user_roles;
create trigger user_roles_updated_at
before update on public.user_roles
for each row execute function public.set_user_roles_updated_at();
