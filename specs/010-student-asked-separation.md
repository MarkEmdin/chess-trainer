# Spec: Asked vs not-asked for the student

Status: done
Branch: feature/student-asked-separation

## Problem

The student can't tell at a glance which positions they already asked the coach about.

1. **Key positions** (`/think-time`): the only sign is the button label ("View thread" instead of "Ask coach"). There is no way to show only the positions not asked about yet, or only the asked ones.
2. **My questions** (`/coaching`): answered and still-waiting questions are mixed in one list.

## Goal

- Every key-position card for a position the student asked about shows a badge: **"Question asked"**, or **"Answered"** once the coach replied.
- Above the key-position list, signed-in students get filter tabs **All / Not asked / Asked**, with counts.
- `/coaching` has two tabs, **Awaiting reply** and **Answered**, with counts, like `/admin`.

## Non-goals

- No "unread answer" tracking. That needs a new column; it can come later.
- No change to the data model, RLS or queries.
- Signed-out visitors see no badges and no filter, the same as today.

## User-facing behavior

### Key positions

- Badge next to the "Thought 47s" chip. "Question asked" is muted. "Answered" uses the primary color with a check icon.
- Filter tabs sit under the threshold picker. "All (12)", "Not asked (9)", "Asked (3)". "Asked" covers both waiting and answered.
- The filter is client state and resets on reload. _(Claude's call: it's a quick view toggle, not a preference worth storing.)_
- Each filter has its own empty message: "You've asked about every position here" / "You haven't asked about any of these positions yet".
- The status line ("12 long thinks across 20 games") keeps counting all positions.

### My questions

- Tabs are "Awaiting reply (2)" / "Answered (5)". The tab lives in the URL (`?tab=answered`), and "Awaiting reply" is the default, matching `/admin`.
- With no questions at all, the page shows the existing empty message with no tabs. An empty tab shows its own message.
- Both tabs list newest first.

## Data & types

- `lib/coaching/status.ts`:
  - `ThreadStatus = 'none' | 'asked' | 'answered'`;
  - `threadStatus(thread?)`, derived from `responses.length`.
- `LongThinkCard`: `existingThread: boolean` becomes `threadStatus: ThreadStatus`.
- `lib/coaching/askedFilter.ts`: `AskedFilter = 'all' | 'unasked' | 'asked'`, `matchesAskedFilter(status, filter)`.

## i18n

New keys (en/ru):

- `coaching.status.asked` "Question asked" / "Вопрос задан"; `coaching.status.answered` "Answered" / "Есть ответ"
- `thinkTime.askedFilter.{all,unasked,asked}`:
  - en: "All ({count})", "Not asked ({count})", "Asked ({count})"
  - ru: "Все ({count})", "Не спрошенные ({count})", "Спрошенные ({count})"
- `thinkTime.emptyUnasked`, `thinkTime.emptyAsked`
- `coachingPage.tabs.{waiting,answered}`: "Awaiting reply ({count})" / "Ждут ответа ({count})", "Answered ({count})" / "Отвеченные ({count})"
- `coachingPage.emptyWaiting`, `coachingPage.emptyAnswered`

## Acceptance criteria

- [x] Card shows "Question asked" / "Answered" / nothing according to status (test)
- [x] Filter matches statuses correctly (test)
- [x] `/coaching` tabs filter, count, and `?tab=answered` selects the second tab (test)
- [x] `/coaching` with no questions shows the old empty message without tabs (test)
- [x] `npm run lint`, `npm test`, `npm run build` pass
