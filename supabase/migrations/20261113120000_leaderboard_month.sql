-- Leaderboard window is now 30 days (spec 037). The function keeps its old
-- name so the running app keeps working between db push and the deploy.
create or replace function public.weekly_leaderboard()
returns table (place int, nickname text, likes int, is_me boolean)
language sql
security definer
stable
set search_path = public
as $$
  with scores as (
    select p.id as user_id, count(distinct a.request_id)::int as likes
    from public.user_profiles p
    left join public.coaching_requests q on q.user_id = p.id
    left join public.coaching_responses a
      on a.request_id = q.id
      and a.liked
      and a.created_at > now() - interval '30 days'
    where p.show_in_leaderboard
    group by p.id
  ), ranked as (
    select user_id, likes, (rank() over (order by likes desc))::int as place
    from scores
  )
  select r.place, p.nickname, r.likes, r.user_id = auth.uid()
  from ranked r
  join public.user_profiles p on p.id = r.user_id
  order by r.place, p.nickname;
$$;
