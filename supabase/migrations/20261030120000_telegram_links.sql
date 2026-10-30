-- Telegram bot notifications (spec 014).
-- telegram_links: which chat a user's notifications go to.
create table public.telegram_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  chat_id bigint not null unique,
  created_at timestamptz not null default now()
);

-- telegram_link_tokens: short-lived single-use codes; only the service role
-- touches this table, so it has RLS on and no policies.
create table public.telegram_link_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.telegram_links enable row level security;
alter table public.telegram_link_tokens enable row level security;

create policy "telegram_links_select_own" on public.telegram_links
  for select to authenticated using (user_id = auth.uid());
create policy "telegram_links_delete_own" on public.telegram_links
  for delete to authenticated using (user_id = auth.uid());

-- Supabase grants new tables to anon directly; revoke so signed-out clients
-- get nothing even if a policy is added later.
revoke all on public.telegram_links from anon;
revoke all on public.telegram_link_tokens from anon;
