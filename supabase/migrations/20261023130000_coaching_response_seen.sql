-- Notification bell (spec 012): when the student first opened the coach's
-- answer. Null while unanswered or not yet opened; one response per request,
-- so one timestamp is enough.
alter table public.coaching_requests
  add column response_seen_at timestamptz;

-- Answers that exist before this ships count as seen, so nobody gets a pile
-- of stale "new" answers on release day.
update public.coaching_requests r
  set response_seen_at = now()
  where exists (
    select 1 from public.coaching_responses where request_id = r.id
  );

-- Requests stay immutable from the client (no UPDATE policy): this is the
-- one write a student may make, only to their own row and only once.
create or replace function public.mark_coaching_response_seen(p_request_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coaching_requests
    set response_seen_at = now()
    where id = p_request_id
      and user_id = auth.uid()
      and response_seen_at is null;
$$;

-- Supabase grants new functions to anon directly, so revoking from public
-- alone leaves it callable signed out.
revoke all on function public.mark_coaching_response_seen(uuid) from public, anon;
grant execute on function public.mark_coaching_response_seen(uuid) to authenticated;
