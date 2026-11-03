-- Spec 020: coach role. Its own migration because a new enum value can't be
-- used in the same transaction that adds it (the next migration uses it).
alter type public.user_role add value if not exists 'coach';
