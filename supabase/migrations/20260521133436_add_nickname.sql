-- Nickname-based login: the client signs up with email/nickname/password
-- but signs in with just nickname/password. Stored as-typed for display,
-- but uniqueness is enforced case-insensitively so "MarkEmdin" and
-- "markemdin" can't both exist.
alter table public.user_profiles
  add column nickname text not null;

create unique index user_profiles_nickname_unique
  on public.user_profiles (lower(nickname));


-- Updated signup trigger: pulls nickname from the auth metadata the client
-- passes via options.data during supabase.auth.signUp(). If metadata lacks
-- 'nickname', the NOT NULL violation rolls back the auth.users insert too
-- — by design, so we can't accidentally create a nickname-less user.
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


-- Server-side helper for nickname-based login. Returns the email of the
-- user whose nickname matches (case-insensitively), or NULL if no match.
-- Called from the signIn server action; the email is then handed to
-- Supabase Auth as usual.
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
