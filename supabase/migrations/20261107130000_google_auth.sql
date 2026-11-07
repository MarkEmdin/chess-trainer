-- Spec 031. The nickname is now only a public name: login is by email or
-- Google. Google sends no nickname, so those users start with a placeholder
-- and nickname_set = false until they pick one.
alter table public.user_profiles
  add column nickname_set boolean not null default true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_app_meta_data->>'provider' = 'email' then
    insert into public.user_profiles (id, nickname, preferred_locale)
    values (
      new.id,
      new.raw_user_meta_data->>'nickname',
      new.raw_user_meta_data->>'preferred_locale'
    );
  else
    -- Never built from the provider's name or email: nicknames are public.
    insert into public.user_profiles (id, nickname, nickname_set)
    values (
      new.id,
      'player_' || left(replace(new.id::text, '-', ''), 12),
      false
    );
  end if;
  return new;
end;
$$;

-- The only writer of nickname. A function rather than a column grant because
-- nickname_set stays server-owned and the format must hold for direct calls.
-- A taken name surfaces as unique_violation (23505).
create function public.set_nickname(p_nickname text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_nickname is null or p_nickname !~ '^[a-zA-Z0-9_-]{3,30}$' then
    raise exception 'bad nickname format' using errcode = '22023';
  end if;
  update public.user_profiles
  set nickname = p_nickname, nickname_set = true
  where id = auth.uid();
end;
$$;

revoke all on function public.set_nickname(text) from public, anon;
grant execute on function public.set_nickname(text) to authenticated;
