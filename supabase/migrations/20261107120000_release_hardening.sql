-- Spec 030. Supabase grants tables to `authenticated` as a whole, so the
-- earlier `revoke update (role)` changed nothing: a column revoke can't take
-- away a table grant. Replace the table grant with a list of safe columns.
revoke update on public.user_profiles from authenticated, anon;
grant update (
  chesscom_username,
  lichess_username,
  preferred_locale,
  telegram_prompt_dismissed,
  show_in_leaderboard
) on public.user_profiles to authenticated;

-- Sign-in looks the address up on the server; nobody else may.
revoke all on function public.lookup_email_by_nickname(text)
  from public, anon, authenticated;
grant execute on function public.lookup_email_by_nickname(text) to service_role;

-- Questions and answers: clients write only what the actions write. The rest
-- (created_at, response_seen_at, liked) stays with the server.
revoke insert on public.coaching_requests from authenticated, anon;
grant insert (
  user_id, game_url, fen, move_index, move_san, body, variation, content, pgn
) on public.coaching_requests to authenticated;

revoke insert on public.coaching_responses from authenticated, anon;
grant insert (
  request_id, body, variation, content, author_id
) on public.coaching_responses to authenticated;

-- The same limits as the actions, for inserts that skip them. `not valid`
-- leaves old rows alone and checks every new one.
alter table public.coaching_requests
  add constraint coaching_requests_body_length
    check (length(body) <= 8000) not valid,
  add constraint coaching_requests_game_url
    check (game_url ~ '^https://') not valid,
  add constraint coaching_requests_move_index
    check (move_index >= 0) not valid,
  add constraint coaching_requests_content_shape
    check (content is null or coalesce(jsonb_typeof(content->'segments'), '') = 'array')
    not valid;

alter table public.coaching_responses
  add constraint coaching_responses_body_length
    check (length(body) <= 8000) not valid,
  add constraint coaching_responses_content_shape
    check (content is null or coalesce(jsonb_typeof(content->'segments'), '') = 'array')
    not valid;

-- Two coaches may both answer a question and both answers are shown. One coach
-- answering twice is a double send.
create unique index coaching_responses_one_per_author
  on public.coaching_responses (request_id, author_id);

-- `response_seen_at` is one timestamp per question, so a later answer has to
-- clear it or the student never sees that one as new. Definer: coaches can't
-- update questions.
create or replace function public.clear_response_seen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coaching_requests
    set response_seen_at = null
    where id = new.request_id
      and response_seen_at is not null;
  return new;
end;
$$;

revoke all on function public.clear_response_seen()
  from public, anon, authenticated;

create trigger coaching_responses_clear_seen
  after insert on public.coaching_responses
  for each row execute function public.clear_response_seen();

-- Approving a coach used to be separate requests, which could stop halfway.
-- Returns the applicant, or null when the application isn't pending.
create or replace function public.approve_coach_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.coach_applications%rowtype;
begin
  select * into app
  from public.coach_applications
  where id = p_application_id and status = 'pending'
  for update;

  if not found then
    return null;
  end if;

  update public.user_profiles
    set role = 'coach'
    where id = app.user_id and role = 'user';

  insert into public.coach_profiles (user_id, first_name, last_name, title)
    values (app.user_id, app.first_name, app.last_name, app.title)
    on conflict (user_id) do update
      set first_name = excluded.first_name,
          last_name = excluded.last_name,
          title = excluded.title;

  -- A coach can't be anyone's student.
  delete from public.coach_students where student_id = app.user_id;

  update public.coach_applications
    set status = 'approved', reviewed_at = now()
    where id = app.id;

  return app.user_id;
end;
$$;

revoke all on function public.approve_coach_application(uuid)
  from public, anon, authenticated;
grant execute on function public.approve_coach_application(uuid) to service_role;

-- Feedback goes straight to Telegram, so this table is its only limit. `key` is
-- a hash of the sender's address; rows live for an hour.
create table public.feedback_throttle (
  key text not null,
  created_at timestamptz not null default now()
);

create index feedback_throttle_key_idx
  on public.feedback_throttle (key, created_at);

alter table public.feedback_throttle enable row level security;
revoke all on public.feedback_throttle from anon, authenticated;

create or replace function public.allow_feedback(p_key text, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.feedback_throttle
    where created_at < now() - interval '1 hour';

  if (select count(*) from public.feedback_throttle where key = p_key)
     >= p_limit then
    return false;
  end if;

  insert into public.feedback_throttle (key) values (p_key);
  return true;
end;
$$;

revoke all on function public.allow_feedback(text, int)
  from public, anon, authenticated;
grant execute on function public.allow_feedback(text, int) to service_role;
