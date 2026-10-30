-- Spec 015: "Don't remind me" on the post-question Telegram offer. Covered
-- by the existing "users update own profile" policy.
alter table public.user_profiles
  add column telegram_prompt_dismissed boolean not null default false;
