-- Spec 020: coaches. Admin (owner's account only) reviews applications,
-- grants the coach role and assigns students. A student with a coach is
-- seen by that coach and the admin; a student without one by every coach.

-- ============================================================
-- Helpers
-- ============================================================

-- Admin or coach. SECURITY DEFINER for the same reason as is_admin: reads
-- user_profiles from inside its own policies without recursion.
create or replace function public.is_staff(user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = user_id and role in ('admin', 'coach')
  );
$$;


-- ============================================================
-- coach_profiles: public signature of a coach ("IM Ivan Petrov")
-- ============================================================
-- Kept after the role is revoked so old answers keep their author's name.
-- Written only by the service role (server actions check the admin role).
create table public.coach_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (length(first_name) between 1 and 50),
  last_name text not null check (length(last_name) between 1 and 50),
  title text not null check (length(title) between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger coach_profiles_set_updated_at
  before update on public.coach_profiles
  for each row execute function public.set_updated_at();

alter table public.coach_profiles enable row level security;

create policy "signed-in users read coach profiles"
  on public.coach_profiles
  for select to authenticated
  using (true);

revoke all on public.coach_profiles from anon;


-- ============================================================
-- coach_applications
-- ============================================================
create table public.coach_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  first_name text not null check (length(first_name) between 1 and 50),
  last_name text not null check (length(last_name) between 1 and 50),
  title text not null check (length(title) between 1 and 10),
  fide_id text check (fide_id is null or fide_id ~ '^[0-9]{1,12}$'),
  chesscom_username text
    check (chesscom_username is null or length(chesscom_username) <= 50),
  lichess_username text
    check (lichess_username is null or length(lichess_username) <= 50),
  about text not null check (length(about) between 1 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (chesscom_username is not null or lichess_username is not null)
);

-- One application under review per user at a time.
create unique index coach_applications_one_pending
  on public.coach_applications (user_id)
  where status = 'pending';

create index coach_applications_user_id_idx
  on public.coach_applications (user_id, created_at desc);

alter table public.coach_applications enable row level security;

create policy "users create own pending application"
  on public.coach_applications
  for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'pending' and reviewed_at is null
  );

create policy "users read own applications"
  on public.coach_applications
  for select to authenticated
  using (user_id = auth.uid());

create policy "admins read all applications"
  on public.coach_applications
  for select to authenticated
  using (public.is_admin(auth.uid()));

revoke all on public.coach_applications from anon;


-- ============================================================
-- coach_students: which coach a student belongs to (at most one)
-- ============================================================
create table public.coach_students (
  student_id uuid primary key references auth.users (id) on delete cascade,
  coach_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (student_id <> coach_id)
);

create index coach_students_coach_id_idx on public.coach_students (coach_id);

alter table public.coach_students enable row level security;

create policy "coach, student and admin read assignments"
  on public.coach_students
  for select to authenticated
  using (
    coach_id = auth.uid()
    or student_id = auth.uid()
    or public.is_admin(auth.uid())
  );

revoke all on public.coach_students from anon;


-- ============================================================
-- Visibility rule (mirrored in lib/coaches/visibility.ts)
-- ============================================================
-- The viewer sees the asker's questions when they are the asker, the admin,
-- or a coach and the asker has no coach or has this one.
create or replace function public.can_see_request(viewer uuid, asker uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    viewer = asker
    or public.is_admin(viewer)
    or (
      exists (
        select 1 from public.user_profiles
        where id = viewer and role = 'coach'
      )
      and not exists (
        select 1 from public.coach_students
        where student_id = asker and coach_id <> viewer
      )
    );
$$;

revoke all on function public.can_see_request(uuid, uuid) from public, anon;
grant execute on function public.can_see_request(uuid, uuid) to authenticated;


-- ============================================================
-- Answer authorship
-- ============================================================
alter table public.coaching_responses
  add column author_id uuid references auth.users (id) on delete set null;

-- Every answer so far was written by the admin.
update public.coaching_responses
  set author_id = (
    select id from public.user_profiles
    where role = 'admin'
    order by created_at
    limit 1
  )
  where author_id is null;


-- ============================================================
-- Policies: admin-only → staff, filtered by visibility
-- ============================================================
drop policy "admins read all coaching requests" on public.coaching_requests;
create policy "staff read visible coaching requests"
  on public.coaching_requests
  for select to authenticated
  using (
    public.is_staff(auth.uid())
    and public.can_see_request(auth.uid(), user_id)
  );

drop policy "admins read all coaching responses" on public.coaching_responses;
create policy "staff read responses to visible requests"
  on public.coaching_responses
  for select to authenticated
  using (
    public.is_staff(auth.uid())
    and exists (
      select 1 from public.coaching_requests r
      where r.id = coaching_responses.request_id
        and public.can_see_request(auth.uid(), r.user_id)
    )
  );

drop policy "admins create coaching responses" on public.coaching_responses;
create policy "staff answer visible requests as themselves"
  on public.coaching_responses
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_staff(auth.uid())
    and exists (
      select 1 from public.coaching_requests r
      where r.id = coaching_responses.request_id
        and public.can_see_request(auth.uid(), r.user_id)
    )
  );

-- Coaches read the nickname of askers they can see; the admin reads all.
drop policy "admins read all profiles" on public.user_profiles;
create policy "staff read visible profiles"
  on public.user_profiles
  for select to authenticated
  using (
    public.is_staff(auth.uid())
    and public.can_see_request(auth.uid(), id)
  );
