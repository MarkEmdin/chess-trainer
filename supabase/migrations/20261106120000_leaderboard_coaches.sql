-- Coaches ask questions too and stronger coaches answer them, so they are
-- ranked. Only the admin stays out.

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
      and p.role <> 'admin'
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
