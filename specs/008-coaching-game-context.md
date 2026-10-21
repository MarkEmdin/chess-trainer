# Spec: Game context in the coaching modal + long-comment fix

Status: done
Branch: feature/coaching-game-context

## Problem

1. **Bug (user complaints).** A long comment in the coaching modal (question or coach's reply) can fail with a server error, and the typed text is wiped. Two causes found while reading the code:
   - The textarea has `maxLength={4000}`, and the server rejects `body.length > 4000`. Browsers count a line break as 1 character in the textarea, but on form submission it becomes `\r\n` (2 characters). A comment with paragraphs passes the browser limit but fails on the server with `coaching.errors.bodyTooLong`.
   - The form uses a React 19 form action with an uncontrolled `<Textarea>`. React resets the form after every action, **including when the action returns an error**, so the text disappears.
2. **Missing context.** The modal shows only the key position. To write a meaningful question, the student wants to recall how the game went. The coach also needs that context to answer. Today the coaching request stores only `game_url`, `fen`, `move_index` and `move_san`, not the game's moves. Chess.com's public API cannot fetch a single game by URL, so the game cannot be reloaded later.

## Goal

- A comment of up to 4000 characters, with any number of line breaks, is accepted. If the server rejects a submission for any reason, the typed text and the recorded variation stay in the form.
- In the coaching modal, student and coach can step through **the whole game**, not just a few moves (user: "даже пускай имеет возможность всю партию посмотреть"). The modal opens on the key position.
- Writing the comment and recording a variation are possible **only while the board shows the key position**, and the UI makes that obvious (user: "это должно быть понятно из UI").
- The coach can see the game: browsable in the modal for new questions, and through a link to the game for all questions.

## Non-goals

- No browsing for questions asked **before** this release. Their PGN was never stored, so they open as today (key position only) plus the game link.
- No fetching games from Chess.com/Lichess when the modal opens.
- No change to the variation recorder itself (40-move cap, tap/drag input).
- No change to the 4000-character limit itself.
- No variations that start from a position other than the key position.

## User-facing behavior

### Modal layout (layout "A", chosen by the user from mockups)

One board. Below it:

- Navigation: ⏮ ◀ ▶ ⏭ (and ← → Home End keys, ignored while focus is in the textarea, as the existing Viewer does).
- A **"Back to key position"** button. It is visible whenever game browsing is available, and highlighted (primary style) while the board is away from the key position. It is disabled while the board is on the key position.
- The game's move list, where the key move is marked ★ and the current move is highlighted. Clicking a move jumps to the position after it.
- **Key move ★ = the move from the modal title** (e.g. "14… Nf6"): the move the student played after the long think, i.e. `moves[keyIndex]`, played *from* the key position `positions[keyIndex]`. Special case: clicking ★ goes to the key position (the board *before* the move), not after it, and while the board is at the key position the ★ move is the highlighted one. *(Claude's call, answering the builder check: the student thinks of "my key move 14… Nf6", and the title already names it.)*

### Away from the key position

- A banner appears above the form: "You're looking at move {move}. You can write and record variations only at the key position {keyMove}." It also has a **"Back to key position"** button.
- The textarea, "Record variation", the draft variation controls and the submit button are **disabled**. Text and draft stay as they are.
- Returning to the key position (either button, or navigating there) re-enables everything.

### Interaction with variations

- **Recording:** recording is only available at the key position. While recording, game navigation is hidden or disabled, so recording and browsing never mix. *(Claude's call.)*
- **Viewing a sent variation** ("View variation" on a message) temporarily replaces the game navigation with the existing Viewer. "Back to position" in the Viewer returns to the key position. *(Claude's call, keeping the existing Viewer behavior.)*
- **Read-only threads** (nobody's turn to write) have no form and no banner. Browsing still works.

### Who gets browsing

| Opened from | Game source | Browsing |
|---|---|---|
| Key Positions → "Ask coach" (new question) | in-memory `Game.pgn` | yes |
| Key Positions → existing thread | stored `pgn` on the request | yes if stored |
| "My questions" page (student) | stored `pgn` | yes if stored |
| Admin page (coach) | stored `pgn` | yes if stored |

Without a stored PGN the modal looks and behaves as today: key position only, no navigation, no banner.

### Game link

- The modal shows a link that opens the game on its platform in a new tab, for every thread that has `game_url` (all of them). *(Claude's call: the user said the coach should see "the game or a link to it". Cards already have one, and the modal gets one too.)*
- The existing card button label `coaching.viewOnChessCom` ("View on Chess.com") is wrong for Lichess games. Replace it with a platform-neutral "Open game" in both the card and the modal. *(Claude's call.)*

### Long comment

- A character counter under the textarea shows `{count} / 4000`, and turns `text-destructive` once over the limit. *(Claude's call.)*
- The count matches what the server counts, with line breaks normalized to `\n`.
- The client blocks submission over the limit. The server normalizes `\r\n` → `\n` before trimming and checking length, and stores the normalized text.

## Data & types

- **Migration** `supabase/migrations/<timestamp>_coaching_pgn.sql`: `alter table public.coaching_requests add column pgn text check (pgn is null or length(pgn) <= 100000);`. Nullable, since old rows have none. Existing RLS insert/select policies cover the new column (same as the variations migration).
- **`createCoachingRequest`** accepts an optional `pgn` form field. The server keeps it only if `buildReplay(pgn)` succeeds **and** `positions[move_index - 1] === fen`. Otherwise it stores `null` and the question is still saved. A broken PGN must never block a question. *(Claude's call.)*
- **Types:** `CoachingThreadData` gains `pgn: string | null` and `move_index: number`. Every select that builds a thread adds both: `useMyCoachingRequests`, `app/[locale]/coaching/page.tsx`, `app/[locale]/admin/page.tsx`. `move_index` is needed for `keyIndex`, because searching for the FEN is unreliable when a position repeats.
- `buildReplay` never throws (a bad PGN returns `[fallbackFen]`), so the server's validity check is just `positions[move_index - 1] === fen`. Both sides produce FENs with chess.js, so no normalization is needed.
- While the student or coach is viewing a sent variation, the form stays unlocked, as today. *(Claude's call.)*
- The **key position index** in the replay is `move_index - 1` (`LongThink.moveIndex` is 1-based, and `fenBefore` is the position before that move). The modal receives it as a prop or derives it. If `positions[keyIndex] !== fen`, it falls back to no browsing.
- **Body normalization** lives in one small exported helper used by both server actions and the client counter, e.g. `normalizeBody(s) = s.replace(/\r\n?/g, '\n')`.

## UI

- `app/components/CoachingModal/`, which is already a feature folder:
  - `index.tsx` gains optional `game?: { pgn: string; keyIndex: number }` (or equivalent) and `gameUrl?: string` props. It also owns the "board index" state and the banner/lock logic.
  - `VariationBoard.tsx` gets a game-browse mode. Reuse `buildReplay`/`formatMoveLabel` from `lib/chess/replay.ts` and the Viewer's navigation pattern; don't fork GameModal.
  - The textarea becomes **controlled** (`useState`), so React's post-action form reset doesn't wipe it.
- Callers pass the new props: `LongThinks` (from `Game`), `CoachingThreadCard` and `CoachingAdminCard` (from stored `pgn` + `game_url`).
- Client component (already `'use client'`).

## i18n

New keys in both `messages/en.json` and `messages/ru.json` (parity test enforces the same tree):

```
coaching.openGame                 // replaces coaching.viewOnChessCom
coaching.game.backToKey           // "Back to key position" / «К ключевой позиции»
coaching.game.lockedBanner        // "You're looking at {move}. You can write and record variations only at the key position {keyMove}."
coaching.charCount                // "{count} / {max}"
```

## Acceptance criteria

- [x] A 3900-character comment with 200 line breaks submits successfully (server test with `\r\n` input).
- [x] When the server action returns an error, the textarea keeps its text and the draft variation is kept.
- [x] Counter shows normalized length; submit is disabled over 4000.
- [x] New question from Key Positions stores `pgn`; mismatched/invalid PGN stores `null` without failing the question.
- [x] Modal with a PGN: navigation over the whole game, ★ on the key move, starts at the key position.
- [x] Away from the key position: banner visible, textarea + record + submit disabled, text kept; "Back to key position" restores.
- [x] Recording disables game navigation.
- [x] Modal without a PGN behaves as before (existing CoachingModal tests stay green).
- [x] "Open game" link in the modal and cards, with neutral label.
- [x] `messages` parity test passes; `npm run lint` zero warnings; `npm test`; `npm run build`.
- [x] Migration applied locally; prod rollout note in the PR (apply migration before deploy).
