-- Spec 022: weekly leaderboard. Staff like answers (default liked); a student
-- earns one point per liked question in the last 7 days. Opt-out per profile.

alter table public.coaching_responses
  add column liked boolean not null default true;

alter table public.user_profiles
  add column show_in_leaderboard boolean not null default true;

-- Staff can no longer answer their own question (also enforced in the action).
drop policy "staff answer visible requests as themselves"
  on public.coaching_responses;
create policy "staff answer visible requests as themselves"
  on public.coaching_responses
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_staff(auth.uid())
    and exists (
      select 1 from public.coaching_requests r
      where r.id = coaching_responses.request_id
        and r.user_id <> auth.uid()
        and public.can_see_request(auth.uid(), r.user_id)
    )
  );

create or replace function public.set_response_liked(
  response_id uuid,
  value boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  asker uuid;
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'not allowed';
  end if;

  select q.user_id into asker
  from public.coaching_responses a
  join public.coaching_requests q on q.id = a.request_id
  where a.id = response_id;

  -- can_see_request is true for the asker, hence the separate own-question check.
  if asker is null
     or not public.can_see_request(auth.uid(), asker)
     or asker = auth.uid() then
    raise exception 'not allowed';
  end if;

  update public.coaching_responses a
    set liked = value
    where a.id = response_id;
end;
$$;

revoke all on function public.set_response_liked(uuid, boolean) from public, anon;
grant execute on function public.set_response_liked(uuid, boolean) to authenticated;

create or replace function public.weekly_leaderboard()
returns table (place int, nickname text, likes int, is_me boolean)
language sql
security definer
stable
set search_path = public
as $$
  with scores as (
    select q.user_id, count(distinct a.request_id)::int as likes
    from public.coaching_responses a
    join public.coaching_requests q on q.id = a.request_id
    join public.user_profiles p on p.id = q.user_id
    where a.liked
      and a.created_at > now() - interval '7 days'
      and p.role = 'user'
      and p.show_in_leaderboard
    group by q.user_id
  ), ranked as (
    select user_id, likes, (rank() over (order by likes desc))::int as place
    from scores
  )
  select r.place, p.nickname, r.likes, r.user_id = auth.uid()
  from ranked r
  join public.user_profiles p on p.id = r.user_id
  where r.place <= 20 or r.user_id = auth.uid()
  order by r.place, p.nickname;
$$;

revoke all on function public.weekly_leaderboard() from public, anon;
grant execute on function public.weekly_leaderboard() to authenticated;
