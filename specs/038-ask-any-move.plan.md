# Ask About Any Move Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A student asks the coach about any of their own moves from the game viewer on /games and /think-time; linked Telegram users get one announcement.

**Architecture:** A pure `findAskTarget` picks the student's move for the shown position. A new `AskCoachModal` wraps `CoachingModal` for "game + target + optional existing thread" and replaces the inline `CoachingModal` in `LongThinks`; `ChessComGames` uses it too. No server or DB change. The broadcast is a standalone `.mjs` CLI plus a tested `.mjs` helper module.

**Tech Stack:** Next.js 16, next-intl, SWR, chess.js, Supabase JS, Jest + RTL, Node 20 ESM.

**Spec:** `specs/038-ask-any-move.md`

## Global Constraints

- The asked move is always the student's (`moves[k].color === game.userColor`).
- `unique (user_id, fen)` unchanged; same fen ⇒ open the existing thread.
- `messages/en.json` and `messages/ru.json` keep the same key tree.
- Broadcast: ≤ 20 msg/s (50 ms gap), one retry on 429 after `retry_after`, 403 ⇒ delete `telegram_links` row, log `scripts/announcements/<id>.sent.json` (gitignored), dry run by default.

## Review Focus

- Student is black, viewer at index 0 → no target, button disabled. Test in Task 1 and Task 3.
- Final position with the student to move → previous student move. Test in Task 1.
- Same fen asked in another game → existing thread opens with that thread's PGN, URL, `move_san` and the "another game" subtitle. Test in Task 2.
- Broadcast re-run after partial send → already-logged chats skipped. Test in Task 5.
- Telegram 429 twice in a row → counted as failed, not logged, loop continues. Test in Task 5.

---

### Task 1: `findAskTarget`

**Files:**
- Create: `lib/coaching/askTarget.ts`
- Test: `tests/lib/coaching/askTarget.test.ts`

**Interfaces:**
- Produces: `type AskTarget = { moveIndex: number; fen: string; label: string }` (moveIndex 1-based, fen = position before that move, label = `formatMoveLabel(move)`); `findAskTarget(positions: string[], moves: ReplayMove[], index: number, userColor: GameColor): AskTarget | null`; `thinkAskTarget(think: LongThink): AskTarget` (`{ moveIndex: think.moveIndex, fen: think.fenBefore, label: formatThinkMove(think) }`; move `formatThinkMove` usage stays in `LongThinks/format.ts`, import it).

- [ ] **Step 1: Failing tests** (build positions/moves with `buildReplay('1. e4 e5 2. Nf3 Nc6', '')`):
  - white, index 0 → `{ moveIndex: 1, fen: positions[0], label: '1. e4' }`
  - white, index 1 (black to move) → moveIndex 1
  - white, index 2 → moveIndex 3, label `2. Nf3`
  - black, index 0 → `null`
  - black, index 1 → moveIndex 2, label `1… e5`
  - white, index 4 (final, white to move, no move) → moveIndex 3
- [ ] **Step 2:** `npm test -- askTarget` → FAIL.
- [ ] **Step 3:** Implement: loop `k` from `min(index, moves.length - 1)` down to 0, first `moves[k].color === userColor` wins.
- [ ] **Step 4:** `npm test -- askTarget` → PASS.
- [ ] **Step 5: Commit** `feat: pick the student's move to ask about`

### Task 2: `AskCoachModal` + thread fields

**Files:**
- Create: `app/components/AskCoachModal/index.tsx`
- Modify: `lib/coaching/types.ts` (optional `game_url?: string; move_san?: string` on `CoachingThreadData`), `lib/coaching/useMyCoachingRequests.ts` (select + map both)
- Modify: `messages/{en,ru}.json`: `coaching.askedInOtherGame` = "You already asked about this position in another game" / "Вы уже спрашивали об этой позиции в другой партии"
- Test: `tests/app/components/AskCoachModal/index.test.tsx`, update `tests/lib/coaching/useMyCoachingRequests.test.tsx`

**Interfaces:**
- Consumes: `AskTarget`.
- Produces: `AskCoachModal({ game: Game; target: AskTarget; thread?: MyCoachingRequest; onClose(): void; onSubmitted(): void; onSeen(): void })`, default export.

Behavior: no thread → `CoachingModal mode="student" fen=target.fen orientation=game.userColor moveLabel=target.label subtitle=<game date> ask={gameUrl: game.url, moveIndex} game={pgn: game.pgn, moveIndex} gameUrl=game.url`. Thread → `moveLabel = thread.move_san ?? target.label`, `game = thread.pgn ? {pgn: thread.pgn, moveIndex: thread.move_index} : undefined`, `gameUrl = thread.game_url ?? game.url`, subtitle = `askedInOtherGame` when `thread.game_url && thread.game_url !== game.url`, else game date. On mount, if `thread && isUnseen(thread)`, `markResponseSeen(thread.id).then(onSeen, () => {})` once per thread id.

- [ ] **Step 1: Failing tests** (mock `@/app/components/CoachingModal` to a stub printing props as data-attributes; mock `@/lib/coaching/actions`):
  - new question: stub gets `fen` = target.fen, `moveLabel` = target.label, `ask.moveIndex`, `game.pgn` = game.pgn
  - thread from another game: `gameUrl` = thread URL, `game.pgn` = thread PGN, `moveLabel` = thread.move_san, subtitle "You already asked about this position in another game"
  - unseen answer: `markResponseSeen` called with thread id, `onSeen` called
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat: one modal for asking from a game`

### Task 3: Ask button in `GameModal`

**Files:**
- Modify: `app/components/ChessComGames/GameModal.tsx`
- Modify: `messages/{en,ru}.json` `games.modal`: `askAbout` "Ask about {move}" / "Спросить о ходе {move}", `questionAbout` "Question about {move}" / "Вопрос о ходе {move}", `goToOwnMove` "Go to one of your moves" / "Перейдите к своему ходу"
- Test: `tests/app/components/ChessComGames/GameModal.test.tsx` (replace the two `onAskCoach` tests)

**Interfaces:**
- Consumes: `findAskTarget`, `AskTarget`, `rememberAsk`.
- Produces: GameModal props `onAsk?: (target: AskTarget) => void; askedFens?: ReadonlySet<string>; isAuthenticated?: boolean` (replaces `onAskCoach`). No `onAsk` ⇒ no button.

Signed in: `<Button>` with `askAbout`/`questionAbout` (`askedFens.has(target.fen)`), click → `onAsk(target)`. No target ⇒ disabled button `coaching.askCoach` with `title={t('goToOwnMove')}`. Guest: `Link href="/register"` styled `buttonVariants({variant:'outline', size:'sm'})`, `onClick={() => rememberAsk(`${game.id}-${target.moveIndex}`)}`, same label; no target ⇒ the disabled button.

- [ ] **Step 1: Failing tests** (game `1. e4 e5 2. Nf3`, white):
  - at index 0 button "Ask about 1. e4"; click → `onAsk` with `{ moveIndex: 1, label: '1. e4' }`
  - after → (index 1) still "Ask about 1. e4"; → again (index 2) "Ask about 2. Nf3"
  - `askedFens` containing the start fen → "Question about 1. e4"
  - black game at index 0 → button "Ask coach" disabled
  - guest → link "Ask about 1. e4" with href ending `/register`
  - no `onAsk` → no ask button
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat: ask about the shown move from the game viewer`

### Task 4: Wire /think-time and /games, tutorial copy

**Files:**
- Modify: `app/components/LongThinks/index.tsx`: `coachingTarget` becomes `{ game: Game; target: AskTarget } | null`; card → `thinkAskTarget(think)`; viewer → `onAsk={(target) => { setGameTarget(null); setCoachingTarget({ game, target }) }}`, `askedFens` from `requestsByFen` keys, `isAuthenticated`; render dynamic `AskCoachModal` with `thread={requestsByFen?.[target.fen]}`, `onSeen={refreshRequests}`; drop inline `markResponseSeen` call and dynamic `CoachingModal`.
- Modify: `app/components/ChessComGames/index.tsx`: `useMyCoachingRequests(isAuthenticated)`, same GameModal props, dynamic `AskCoachModal`.
- Modify: `messages/{en,ru}.json` `tutorial.ask.steps.find.text`: ru "Откройте «Позиции», введите свой ник на Chess.com или Lichess и выберите ход, над которым долго думали. Или откройте любую партию в разделе «Партии», дойдите до своего хода и нажмите «Спросить о ходе». Для этого нужен аккаунт."; en equivalent.
- Test: `tests/app/components/LongThinks/LongThinks.test.tsx` (stub exposes `onAsk`), new `tests/app/components/ChessComGames/ChessComGames.test.tsx`.

- [ ] **Step 1: Failing tests:** LongThinks viewer stub calling `onAsk(target)` opens the coaching stub; ChessComGames: selecting a game then `onAsk` renders the ask stub.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** `npm test`, `npm run lint` → PASS.
- [ ] **Step 5: Commit** `feat: ask any move on /games and /think-time`

### Task 5: Telegram broadcast script

**Files:**
- Create: `scripts/broadcast.mjs` (pure helpers), `scripts/telegram-broadcast.mjs` (CLI), `scripts/announcements/.gitkeep`
- Modify: `.gitignore` (`/scripts/announcements/*.sent.json`), `messages/{en,ru}.json` `telegram.announcements.askAnyMove.{text,button}` (copy from spec)
- Test: `tests/scripts/broadcast.test.ts`

**Interfaces (scripts/broadcast.mjs, JSDoc-typed):**
- `ANNOUNCEMENTS = { 'ask-any-move': { key: 'askAnyMove', path: '/games' } }`
- `toLocale(x) → 'ru' | 'en'`
- `buildMessage(messages, key, locale, site) → { text, button: { text, url: `${site}/${locale}${path}` } }`
- `planRecipients(links: {chat_id, user_id}[], profiles: {id, preferred_locale}[], sent: Set<number>) → { todo: {chatId, locale}[], skipped: number }`
- `sendAll(todo, { send(chatId, locale) → Promise<{ok:true}|{ok:false,status,retryAfter?}>, sleep(ms), onSent(chatId), onBlocked(chatId), gapMs = 50 }) → { sent, blocked, failed }`

- [ ] **Step 1: Failing tests:** planRecipients skips logged chats and defaults locale to en; buildMessage gives ru URL `https://x/ru/games` and the ru button text; sendAll: ok → onSent; 403 → onBlocked, not onSent; 429 then ok → sleeps `retryAfter*1000`, sent; 429 twice → failed, loop continues to next chat.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement helpers, then CLI: args `<id> <site> [--send]`, env `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`; reads `messages/*.json`, `telegram_links` + `user_profiles`; dry run prints per-locale counts and the ru/en texts; `--send` appends to the log after each send (rewrite JSON array).
- [ ] **Step 4:** `npm test -- broadcast` → PASS; `node scripts/telegram-broadcast.mjs` without args prints usage and exits 1.
- [ ] **Step 5: Commit** `feat: telegram broadcast script for release news`

### Task 6: Verify and close

- [ ] `npm test`, `npm run lint`, `npm run build` all pass.
- [ ] Manual in dev: /games ask from a quick move; same position from another game opens the thread.
- [ ] Spec ACs ticked, `Status: done` on merge.
