-- Role enum used by RLS policies and any future server-side authorization
-- checks. Stored as a column on user_profiles (not in JWT claims) so role
-- changes take effect on the next request without waiting for token refresh.
create type public.user_role as enum ('user', 'admin');


-- App-level profile, 1:1 with auth.users (which Supabase Auth manages).
-- A row is auto-created by the on_auth_user_created trigger below.
--
-- nickname is the login identifier (users sign in by nickname, not email)
-- and is unique case-insensitively via the index further down. NOT NULL
-- means a nickname-less signup fails at the DB level by design.
--
-- chesscom_username / lichess_username are user-managed, nullable platform
-- handles edited from the profile page.
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  nickname text not null,
  chesscom_username text,
  lichess_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index user_profiles_nickname_unique
  on public.user_profiles (lower(nickname));


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


-- Auto-create a profile when a new auth user is registered. Pulls nickname
-- from the auth metadata that the client passes via options.data during
-- supabase.auth.signUp(). SECURITY DEFINER runs the insert with elevated
-- privileges so RLS doesn't block it (the inserting user doesn't exist
-- yet at the moment of signup).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, nickname)
  values (
    new.id,
    new.raw_user_meta_data->>'nickname'
  );
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


-- Server-side helper for nickname-based login. Returns the email of the
-- user whose nickname matches (case-insensitively), or NULL if no match.
-- Called from the signIn server action with service_role; the email is
-- then handed to Supabase Auth as usual.
create or replace function public.lookup_email_by_nickname(p_nickname text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select u.email
  from auth.users u
  join public.user_profiles p on p.id = u.id
  where lower(p.nickname) = lower(p_nickname)
  limit 1;
$$;


-- Row-Level Security on user_profiles.
alter table public.user_profiles enable row level security;

create policy "users read own profile"
  on public.user_profiles
  for select
  using (auth.uid() = id);

create policy "admins read all profiles"
  on public.user_profiles
  for select
  using (public.is_admin(auth.uid()));

-- Users can update their own profile row. The column-level REVOKE below
-- makes sure a stray "set role='admin'" still fails even though the
-- row-level policy fires — defence in depth around privilege escalation.
create policy "users update own profile"
  on public.user_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update (role) on public.user_profiles from authenticated, anon;
