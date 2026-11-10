# Spec: Simple first visit

Status: approved
Branch: feature/first-visit

## Problem

Friends who tried the site found the first screen hard to understand. The
landing has a long paragraph, a "how it works" block, four feature cards and
a "coming soon" block, and the one button leads to another page where the
nickname is asked for. After that, three common cases end in a dead end:

- the nickname is not found: only "User not found." is shown;
- the account has no games: the page says there are no thinks over N seconds,
  which is wrong (the shell passes the threshold message for "no games");
- the games have no long thinks: the default threshold is 45 s, which blitz
  players rarely reach, and the list is simply empty.

Players with old games also say they don't remember what they were thinking,
so they don't know what to write.

## Goal

A guest types their nickname on the first screen and lands on their positions.
Every empty case says what happened and offers one next step. A player looking
at an old game is told that thinking about it now is fine.

## Non-goals

- Email notifications (answers go to Telegram).
- Analytics.
- Asking about a position that is not from the player's games.
- Changing the default threshold.
- Any new visual style: reuse the current tokens, `Button`, `Input`, cards and
  spacing.

## User-facing behavior

### Landing (guests; signed-in users are still redirected to `/think-time`)

First screen, same two-column layout as now (demo on the right on desktop,
below on phones):

- Headline unchanged: "Живой тренер разберёт ваши партии" / "A real coach
  reviews your games".
- One short line: "Найдём ходы, где вы думали дольше всего. Опишите свои
  мысли, и тренер ответит. Ответ может прийти в Телеграм." / "We find the
  moves you thought about longest. Describe your thinking and a coach will
  answer. The answer can come to Telegram."
- Chess.com / Lichess toggle, a nickname field and a button "Найти мои
  позиции" / "Find my positions". Submitting saves the nickname in this
  browser for the chosen platform, clears the nickname saved for the other
  platform, and opens `/think-time`. Empty input keeps the button disabled.
- The labelled sample question and answer stays.

Below: "How it works" stays as three steps with shorter text. The feature
cards and the "coming soon" block are removed.

### Nickname not found (`/think-time` and `/games`)

"Пользователь {username} не найден на Chess.com. Проверьте написание." plus a
button "Искать {username} на Lichess" (and the reverse for Lichess). The
button moves the nickname to the other platform and loads it. The existing
"Change user" button stays.

### No games at all

"У {username} пока нет партий. Сыграйте партию в рапид (от 10 минут) и
возвращайтесь: в ней будут ходы, над которыми вы думали." with links to
Chess.com and Lichess play pages. Same text on `/games` and `/think-time`.

### Games, but no thinks over the threshold (`/think-time`)

- If a lower preset (15, 30, 45, 60, 90 s) finds thinks: "В загруженных
  партиях нет ходов с думой от {threshold} с." plus a button "Показать ходы
  от {lower} с", using the highest such preset. Clicking sets the threshold.
- If no preset finds any: "В этих партиях нет долгих раздумий. Сыграйте
  партию в рапид и возвращайтесь: свежие партии лучше всего."

### Old games

In the position detail, if the game ended more than 7 days ago, one muted line
above the "Ask coach" button: "Не помните, о чём думали? Не страшно: решите
позицию сейчас, как задачу. Тренер разберёт ваш ход мыслей."

The writing window label changes for all games to "Что вы думали — или
думаете сейчас — в этой позиции?"

## Data & types

No migration. Pure helpers in `lib/games/`:

- `lowerThresholdWithThinks(games, threshold, presets)` in `longThinks.ts`:
  the highest preset below `threshold` that yields at least one think, or
  `null`.
- `isOldGame(endTime, now)` in a new `lib/games/age.ts`: more than 7 days.

`THRESHOLD_PRESETS` moves from `ThresholdSelector` to `lib/games/constants.ts`.

## UI

- `app/[locale]/page.tsx`: new hero, cards and "coming soon" removed.
- New client component `app/components/LandingNickForm/index.tsx`
  (`useStoredUsername`, `useStoredLichessUsername`, `useRouter` from
  `@/i18n/navigation`, `PlatformToggle`, `Input`, `Button`).
- `GamesShell`: owns the not-found and no-games blocks; the `emptyMessage`
  prop is removed. Adds a "switch platform with this nickname" action.
- `LongThinks`: no-thinks block with the lower-threshold button.
- `PositionDetail`: old-game hint.

## i18n

Removed: `home.ctaPrimary`, `home.features.*`, `home.future.*`,
`common.games.errorNotFound`, `common.games.emptyGames`.

Added (both locales):

- `home.subhead` (rewritten), `home.form.submit`, `home.form.placeholder`
- `home.howItWorks.*.text` (shortened)
- `common.games.notFound` `{username, platform}`, `common.games.tryOther`
  `{username, platform}`, `common.games.noGames` `{username}`,
  `common.games.playChesscom`, `common.games.playLichess`
- `thinkTime.showLower` `{seconds}`, `thinkTime.noThinks`, `thinkTime.oldGame`
- `coaching.bodyLabel` (rewritten)

## Decisions made by Claude

- The demo stays on the right on desktop to keep the current look.
- The "fresh games are best" line lives in the no-thinks message, not as a
  separate line on the page, to keep the page short.
- Submitting the landing form clears the other platform's saved nickname, so
  `/think-time` opens the platform the guest just chose.

## Acceptance criteria

- [ ] Guest types a nickname on `/`, presses Enter, lands on `/think-time`
      with that nickname loading on the chosen platform
- [ ] Landing has no feature cards and no "coming soon" block
- [ ] Not found shows the nickname and a working "search on the other
      platform" button
- [ ] No games shows the rapid hint and play links on both pages
- [ ] No thinks offers the highest lower preset that has thinks
- [ ] Old games show the hint; fresh ones don't
- [ ] `npm test`, `npm run lint`, `npm run build` pass
