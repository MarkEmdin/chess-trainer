-- Local-dev seed: pre-populate one admin user.
-- Runs only on `supabase db reset` against the local stack, not on production
-- deploys. The password is in plaintext here ON PURPOSE — Postgres hashes it
-- via crypt() before storage, matching how Supabase Auth stores passwords.

do $$
declare
  admin_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    admin_id,
    'authenticated',
    'authenticated',
    'mark@chess-fundamentals.local',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- on_auth_user_created trigger has already inserted a row in user_profiles
  -- with role='user' — promote it to admin here.
  update public.user_profiles
  set role = 'admin'
  where id = admin_id;
end $$;
