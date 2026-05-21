-- Persist the user's UI language so it follows them across sessions and
-- devices. Nullable: a user with NULL falls back to URL/browser-detection
-- (next-intl's default). No CHECK constraint — the server action enforces
-- the allowed set; this way adding a third locale doesn't need a migration.
alter table public.user_profiles
  add column preferred_locale text;


-- Updated signup trigger: also seeds preferred_locale from auth metadata
-- so a user who signs up on /ru/register doesn't get flipped to /en on
-- the next login. The signUp server action reads getLocale() and passes
-- it through options.data.
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
