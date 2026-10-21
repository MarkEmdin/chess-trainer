-- The game's PGN, saved with a question so the coaching modal can replay the
-- whole game (Chess.com can't serve a single game by URL later). Nullable:
-- questions asked before this column existed have none. Validated against
-- `fen` / `move_index` in the server action; the check only bounds the size.
-- Existing insert/select policies cover it.
alter table public.coaching_requests
  add column pgn text
  check (pgn is null or length(pgn) <= 100000);
