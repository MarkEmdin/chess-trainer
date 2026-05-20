-- Role enum used by RLS policies and any future server-side authorization checks.
-- Stored as a column on user_profiles (not in JWT claims) so role changes take
-- effect on the next request without waiting for a token refresh.
create type public.user_role as enum ('user', 'admin');


-- App-level profile, 1:1 with auth.users (which Supabase Auth manages).
-- One row per auth user is created automatically by the on_auth_user_created
-- trigger below.
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Keep updated_at fresh on every row mutation.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();


-- Auto-create a profile when a new auth user is registered.
-- SECURITY DEFINER runs the insert with elevated privileges so RLS doesn't
-- block it (the inserting "user" doesn't exist yet at the moment of signup).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Helper used by RLS policies and any future "admins see/do everything"
-- checks. SECURITY DEFINER + stable lets it bypass RLS when reading
-- user_profiles, which avoids policy recursion (a policy on user_profiles
-- would otherwise call itself).
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = user_id and role = 'admin'
  );
$$;


-- Row-Level Security.
alter table public.user_profiles enable row level security;

create policy "users read own profile"
  on public.user_profiles
  for select
  using (auth.uid() = id);

create policy "admins read all profiles"
  on public.user_profiles
  for select
  using (public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies for now — writes happen via the
-- on_auth_user_created trigger (SECURITY DEFINER) at signup, and any other
-- mutation goes through service_role on the server. Policies for user-editable
-- fields (e.g. chesscom_username) will be added when those columns exist.
