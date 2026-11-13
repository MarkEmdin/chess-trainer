# Spec: Monthly leaderboard with a podium

Status: done
Branch: feature/monthly-leaderboard

## Problem

The leaderboard counts only the last 7 days. With few users most weeks give
most people zero, so the table says little. The subtitle "Coach likes over the
last 7 days" is noise the user wants gone.

## Goal

`/leaderboard` ranks players by coach likes over the last 30 days (a rolling
window, so the table never resets to empty on the 1st). The subtitle is gone.
The top three places show as podium cards; everyone else, zeros included,
stays in the list below. One quiet line under the list says how to score.

## Non-goals

- Calendar months, archives of past months, all-time ranking.
- Hiding or collapsing players with zero likes (user wants to see everyone
  while there are few users).
- Renaming the `weekly_leaderboard` RPC. Renaming would break the running
  code between `supabase db push` and the deploy; the name stays, a comment
  in the migration explains it.

## User-facing behavior

- Title: "Leaderboard of the month" / "Лидерборд месяца". No subtitle.
- Places 1-3 with at least one like show as cards in a row above the list:
  cup in the place colour, nickname (or "You"), count. Ties share a place,
  so there may be more than three cards; the grid wraps.
- Everyone else, including players with 0 likes, is listed below as today.
- If nobody has a like, there is no podium and everyone is in the list.
- Under the list: "A coach likes a good question. One like is one position." /
  "Тренер ставит лайк за хороший вопрос. Один лайк — одна позиция."
- Own row/card is outlined in primary, as today.

## Data & types

- New migration: `create or replace function public.weekly_leaderboard()`
  with `interval '30 days'`. Same signature, same return shape.
- No type changes.

## UI

- `app/components/Leaderboard/index.tsx` (server component): split rows into
  podium (has a cup) and the rest.
- `app/[locale]/leaderboard/page.tsx`: drop the subtitle.

## i18n

- `leaderboard.title`, `leaderboard.empty` change to "month".
- `leaderboard.subtitle` removed; `leaderboard.hint` added.
- `/about` leaderboard card text: "of the week" → "of the month".

## Acceptance criteria

- [ ] Likes from 8-30 days ago count; older than 30 days do not
- [ ] No subtitle on the page
- [ ] Top 3 with likes render as podium cards; zeros stay listed
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` passes
- [ ] Tests updated under `tests/app/components/Leaderboard/`
