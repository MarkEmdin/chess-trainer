-- Coaching feature: signed-in users ask the coach about a specific
-- long-think position; the coach (admin) replies. One request per
-- (user, fen) pair — the UI repurposes the "Ask" button to show the
-- existing thread once a request exists.

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


-- Row-Level Security
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
