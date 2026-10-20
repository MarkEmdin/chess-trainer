-- Optional recorded line (SAN moves from the request's `fen`) attached to a
-- question or an answer. Legality is validated in the server actions; the
-- check only bounds the size. Existing insert/select policies cover it.
alter table public.coaching_requests
  add column variation text[]
  check (variation is null or cardinality(variation) between 1 and 40);

alter table public.coaching_responses
  add column variation text[]
  check (variation is null or cardinality(variation) between 1 and 40);
