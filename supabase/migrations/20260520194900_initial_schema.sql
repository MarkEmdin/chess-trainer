-- ============================================================
-- Roles
-- ============================================================

-- App-level role enum used by RLS policies and any future server-side
-- authorization checks. Stored as a column on user_profiles (not in JWT
-- claims) so role changes take effect on the next request without
-- waiting for token refresh.
create type public.user_role as enum ('user', 'admin');


-- ============================================================
-- user_profiles — 1:1 with auth.users
-- ============================================================
--
-- A row is auto-created by the on_auth_user_created trigger below.
--
-- nickname is the login identifier (users sign in by nickname, not
-- email) and is unique case-insensitively via the index further down.
-- NOT NULL means a nickname-less signup fails at the DB level by design.
--
-- chesscom_username / lichess_username are user-managed, nullable
-- platform handles edited from the profile page.
--
-- preferred_locale follows the user across sessions and devices; null
-- means "no preference, fall back to URL/browser-detection". No CHECK
-- constraint — the server action enforces the allowed set so adding a
-- third locale later won't need a migration.
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  nickname text not null,
  chesscom_username text,
  lichess_username text,
  preferred_locale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index user_profiles_nickname_unique
  on public.user_profiles (lower(nickname));


-- ============================================================
-- Shared updated_at trigger function
-- ============================================================

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


-- ============================================================
-- Signup trigger
-- ============================================================

-- Auto-creates a user_profiles row when a new auth user is registered.
-- Reads nickname and preferred_locale from auth metadata that the
-- client passes via options.data during supabase.auth.signUp().
-- SECURITY DEFINER runs the insert with elevated privileges so RLS
-- doesn't block it (the inserting user doesn't exist yet at the moment
-- of signup).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, nickname, preferred_locale)
  values (
    new.id,
    new.raw_user_meta_data->>'nickname',
    new.raw_user_meta_data->>'preferred_locale'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- Helper functions
-- ============================================================

-- Used by RLS policies and any "admins see/do everything" check.
-- SECURITY DEFINER + stable lets it bypass RLS when reading
-- user_profiles, which avoids policy recursion (a policy on
-- user_profiles would otherwise call itself).
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

-- Server-side helper for nickname-based login. Returns the email of
-- the user whose nickname matches (case-insensitively), or NULL if no
-- match. Called from the signIn server action with service_role; the
-- email is then handed to Supabase Auth as usual.
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


-- ============================================================
-- user_profiles RLS
-- ============================================================

alter table public.user_profiles enable row level security;

create policy "users read own profile"
  on public.user_profiles
  for select
  using (auth.uid() = id);

create policy "admins read all profiles"
  on public.user_profiles
  for select
  using (public.is_admin(auth.uid()));

-- Users update their own profile row. The column-level REVOKE below
-- ensures a stray "set role='admin'" still fails even though the
-- row-level policy fires — defence in depth around privilege escalation.
create policy "users update own profile"
  on public.user_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update (role) on public.user_profiles from authenticated, anon;


-- ============================================================
-- Coaching: requests + responses
-- ============================================================
--
-- Signed-in users ask the coach about a specific long-think position;
-- the coach (admin) replies. One request per (user, fen) pair — the
-- UI repurposes the "Ask" button to show the existing thread once a
-- request exists.

create table public.coaching_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Denormalised position snapshot: chess.com archives can be deleted,
  -- but we want the thread to keep its context regardless. We re-render
  -- the board in the admin UI from `fen` directly.
  game_url text not null,
  fen text not null,
  move_index int not null,
  move_san text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fen)
);

create index coaching_requests_user_id_idx
  on public.coaching_requests (user_id);
-- Newest-first lookup for the admin dashboard.
create index coaching_requests_created_at_idx
  on public.coaching_requests (created_at desc);

create trigger coaching_requests_set_updated_at
  before update on public.coaching_requests
  for each row execute function public.set_updated_at();


create table public.coaching_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.coaching_requests(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- FK does not auto-index in Postgres; needed for the "responses to a
-- request" lookup the user thread page will run on every load.
create index coaching_responses_request_id_idx
  on public.coaching_responses (request_id);


-- ============================================================
-- Coaching RLS
-- ============================================================

alter table public.coaching_requests enable row level security;
alter table public.coaching_responses enable row level security;

-- coaching_requests: users read/write their own; admins read everything.

create policy "users read own coaching requests"
  on public.coaching_requests
  for select
  using (auth.uid() = user_id);

create policy "admins read all coaching requests"
  on public.coaching_requests
  for select
  using (public.is_admin(auth.uid()));

create policy "users create own coaching requests"
  on public.coaching_requests
  for insert
  with check (auth.uid() = user_id);

-- No UPDATE/DELETE policies: a submitted request is immutable from the
-- client side. If a user needs to edit, they delete (which is also
-- locked — only service_role can clean up).


-- coaching_responses: users see responses to their own requests; admins
-- see and create everything.

create policy "users read responses to own requests"
  on public.coaching_responses
  for select
  using (
    exists (
      select 1 from public.coaching_requests
      where coaching_requests.id = coaching_responses.request_id
      and coaching_requests.user_id = auth.uid()
    )
  );

create policy "admins read all coaching responses"
  on public.coaching_responses
  for select
  using (public.is_admin(auth.uid()));

create policy "admins create coaching responses"
  on public.coaching_responses
  for insert
  with check (public.is_admin(auth.uid()));
