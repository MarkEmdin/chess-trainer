# Spec: Ask about any move

Status: in-progress
Branch: feature/ask-any-move

## Problem

A student can ask the coach only about a long think: the "Ask coach" button
lives on the /think-time card, and the game viewer offers it only when it was
opened from that card. Many moves worth asking about were played quickly (a
blunder in two seconds, an opening move the student isn't sure of), and the
/games page has no way to ask at all. The tutorial already says "any game from
the Games section works", which isn't true yet.

## Goal

From the game viewer, on /games and on /think-time, a signed-in student can ask
the coach about any of their own moves in the game. If they already asked about
that position, they see that question (and the answer, if there is one) instead
of an error. Students with Telegram linked get one message announcing it.

## Non-goals

- Positions that are not from the student's own games (FEN/PGN paste, board
  setup).
- Questions about the opponent's moves. The question is always about the
  student's move, so every screen that assumes "the side to move is the
  student" (board orientation on /coaching and /admin, "you" label in the
  game browser) stays correct.
- Changing the "one question per position" rule (`unique (user_id, fen)`).
- An in-site banner about the new feature (the user picked the Telegram
  message only).
- An admin UI for announcements. Broadcast is a one-off script.

## User-facing behavior

### Game viewer (`GameModal`), /games and /think-time

The button row under the board gets one button whose label names the move it
asks about:

- "Спросить о ходе 14. Nf3" / "Ask about 14. Nf3".
- The move is the student's move nearest at or before the shown position:
  - student to move and a move was played here: that move (the board shows
    the position before it, exactly like a long-think card);
  - opponent to move (the board shows the position right after the
    student's move): the student's move just played;
  - final position with the student to move: the student's previous move.
- No student move at or before the position (the student is black and the
  board is at the start): the button is disabled and reads
  "Спросить тренера" / "Ask coach", with the hint "Перейдите к своему ходу" /
  "Go to one of your moves" as its `title`.
- The student already asked about that position (in this game or another
  one): the label is "Вопрос о ходе 14. Nf3" / "Question about 14. Nf3" and
  the button opens that thread.

Clicking closes the viewer and opens the usual coaching modal on the
position before that move, with the game browsable around it. Sending works
exactly as from a long-think card (draft, telegram prompt, staff
notification).

Guests see the same label as a link to /register. The position is
remembered like on a long-think card; after signing up it is restored on
/think-time when that move is a long think, otherwise it is not.

### Same position asked before

The coaching modal shows the earlier thread: question, answer(s) or
"awaiting reply". An unseen answer is marked seen, as on /think-time. The
board browses the game the question was asked in (its saved PGN) and the
"open game" link goes there. When that game differs from the one being
viewed, the subtitle reads "Вы уже спрашивали об этой позиции в другой
партии" / "You already asked about this position in another game".

### /think-time

Unchanged, except that the viewer's button now follows the shown move. A
question asked from the viewer about a long-think move shows on that card
as asked (same position).

### Tutorial

The "ask the coach" step says any of your moves in any game can be asked
about.

### Telegram announcement

One message to every linked chat, in the user's locale (`preferred_locale`,
English fallback, same as the bot):

- ru: "🆕 Теперь тренеру можно задать вопрос о любом вашем ходе, а не только
  о долгих раздумьях. Откройте партию в разделе «Партии», дойдите до нужного
  хода и нажмите «Спросить о ходе»." Button: "Открыть партии" →
  `<site>/ru/games`.
- en: "🆕 You can now ask the coach about any of your moves, not only long
  thinks. Open a game in the Games section, go to the move and press
  \"Ask about\"." Button: "Open games" → `<site>/en/games`.

Run by hand:

```
node --env-file=.env.prod.local scripts/telegram-broadcast.mjs ask-any-move https://<site>          # dry run
node --env-file=.env.prod.local scripts/telegram-broadcast.mjs ask-any-move https://<site> --send   # send
```

- Dry run prints how many chats would get it, per locale, and sends nothing.
- `--send` sends one by one at ≤ 20 messages a second, retries once on 429
  after `retry_after`, unlinks chats that blocked the bot (403, same as the
  app), and appends every delivered `chat_id` to
  `scripts/announcements/<id>.sent.json` right away. Re-running skips those
  chats, so a crash or a second run never sends twice. The log is gitignored.
- At the end it prints sent / skipped / blocked / failed counts.

## Data & types

- No migration. `createCoachingRequest` already accepts any `fen` +
  `move_index` + `pgn` that replay to each other.
- `lib/coaching/askTarget.ts`: `AskTarget = { moveIndex: number /* 1-based */,
  fen: string, label: string }`; `findAskTarget(positions, moves, index,
  userColor): AskTarget | null` (pure); `thinkAskTarget(think)`.
- `useMyCoachingRequests` also selects `game_url` and `move_san`;
  `CoachingThreadData` gains optional `game_url` and `move_san`.
- `scripts/broadcast.mjs`: pure helpers (recipient planning, message build,
  send loop with injected `send`/`sleep`), tested from
  `tests/scripts/broadcast.test.ts`. `scripts/telegram-broadcast.mjs`: the CLI
  (env, Supabase, Telegram, log file). Plain `.mjs` because Node 20 can't run
  TypeScript and the script must run without the app.
- Message text lives in `messages/{en,ru}.json` under
  `telegram.announcements.askAnyMove.{text,button}`; the script reads the
  JSON files.

## UI

- `app/components/AskCoachModal/index.tsx` (client): wraps `CoachingModal`
  for a game + `AskTarget` + optional existing thread; picks the thread's
  own game when there is a thread; marks an unseen answer seen. Used by
  `LongThinks` (card and viewer) and `ChessComGames`. Loaded with
  `dynamic(..., { ssr: false })`.
- `GameModal`: `onAskCoach` replaced by `onAsk(target)`, `askedFens` and
  `isAuthenticated`.
- `ChessComGames`: fetches the student's threads and renders `AskCoachModal`.

## i18n

- `games.modal.askAbout`, `games.modal.questionAbout`,
  `games.modal.goToOwnMove`
- `coaching.askedInOtherGame`
- `telegram.announcements.askAnyMove.text`,
  `telegram.announcements.askAnyMove.button`
- `tutorial` ask step text updated

## Acceptance criteria

- [ ] On /games a signed-in student opens a game, steps to any of their moves
      and asks; the question appears on /coaching and staff get the Telegram
      notification
- [ ] The button names the student's move for every shown position, and is
      disabled when there is none
- [ ] A position asked before opens the earlier thread (with the other game's
      board and link), never "already asked"
- [ ] /think-time card and viewer still open the same question as before
- [ ] Guests get a register link
- [ ] Broadcast dry run prints counts and sends nothing; `--send` sends once
      per chat, survives a re-run without duplicates, unlinks blocked chats
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` passes
- [ ] Tests added under `tests/` for the new logic and components
