# Spec: Guided question form

Status: approved
Branch: feature/guided-question

## Problem

A student asking the coach sees one empty field: "What were you thinking, or
what are you thinking now, in this position?". Some students don't know what
to write and give up, or send one vague line. The coach then has to guess what
the student saw and where they got stuck.

## Goal

The student's ask form walks them through three short steps instead of one
blank field. A student who doesn't like writing can send a useful question
with a couple of moves on the board and one tap. The coach receives a normal
message that reads as clearly as a well-written free-text one.

Success: the share of opened ask forms that end in a sent question goes up.
(Not measured in this release; noted for later.)

## Non-goals

- Storing the answers as separate fields in the database (statistics like
  "most students can't calculate"). Too few users for that to pay off; a
  migration and a new coach screen would double the work.
- Any change to the coach's reply form, the thread view, or old questions.
- A "write freely" switch back to the old single field. Step 1 is the same
  editor as before and accepts any text, steps 2 and 3 are optional, so a
  student who likes writing loses nothing. (Our call; add the switch if
  someone asks.)
- Changing the tutorial page or its screenshots beyond the one renamed label.

## Approaches

1. **Guided steps composed into one message** (picked). Three steps in the
   form; on send they are joined into the existing message content (text and
   move segments). No migration, the coach and every preview see a normal
   message.
2. Separate database fields per step. Enables statistics later; needs a
   migration, a new coach view and changes to previews. Rejected for now.
3. Only a better placeholder in the single field. Ten minutes of work, but
   barely helps the students this is for.

## User-facing behavior

Only the student's form for a **new** question changes (`CoachingModal`,
`mode === 'student'`, no thread yet). Everything else stays as it is.

```
1. Какие ходы рассматривали?
   [editor: make moves on the board, they appear here as chips]

2. Что мешало выбрать?            (several can be picked)
   [Не видел плана] [Боялся угрозы соперника]
   [Не смог досчитать] [Не мог выбрать между ходами]

3. Что хотите спросить у тренера? (необязательно)
   [ plain text ]
                                        [Отправить тренеру]
```

- Step 1 is the existing `MoveEditor` (chips from the board, drawings, text),
  only with a new label and placeholder. Recording, drafts and the
  "how to fill" link work as today.
- Step 2 is a row of toggle buttons; any number can be on.
- Step 3 is a plain multi-line text field.
- Send is enabled when at least one step has something in it, and the
  combined text is within `MAX_BODY_LENGTH`. The character counter counts
  the combined text.

### What the coach receives

Filled steps become lines, in the student's language; empty steps are left
out:

```
Кандидаты: 14. Nf3 14. e5
Мешало: не видел плана, не смог досчитать
Вопрос: почему не e5?
```

```
Candidates: 14. Nf3 14. e5
Held me back: couldn't see a plan, couldn't calculate it
Question: why not e5?
```

The "Кандидаты:" line keeps the step 1 content as is (chips stay clickable
for the coach). Body text (previews, Telegram notification, admin list) is
the same text without chip styling.

### Drafts

The draft of a new question also keeps the picked reasons and the step 3
text, so an accidental close keeps all three steps. Old drafts without these
fields still load.

## Data & types

- `app/constants/questionReasons.ts`: `QUESTION_REASONS = ['noPlan',
  'threat', 'calculation', 'choice'] as const` and the `QuestionReason` type.
- `lib/coaching/guidedQuestion.ts`: pure function
  `composeGuidedContent(steps, labels): MessageContent` that joins the step 1
  content, the reason labels and the step 3 text into one `MessageContent`
  (text segments plus the step 1 move segments, lines and drawings). Unit
  tested.
- `lib/coaching/drafts.ts`: `Draft` gets optional `reasons` and `question`;
  `loadDraft` drops unknown reason ids.
- No server change: `createCoachingRequest` already rebuilds `body` from
  `content`. No migration.

## UI

- `app/components/CoachingModal/index.tsx`: the student new-question form
  renders the three steps; the hidden `content` / `body` inputs carry the
  composed content.
- New `app/components/CoachingModal/ReasonPicker.tsx` (internal to the
  feature folder): the toggle row. Client component (event handlers).

## i18n

Under `coaching.guided.*` in both `messages/en.json` and `messages/ru.json`:

- `candidatesLabel`, `candidatesPlaceholder`
- `reasonsLabel`, `reasons.noPlan`, `reasons.threat`,
  `reasons.calculation`, `reasons.choice`
- `questionLabel`, `questionPlaceholder`
- `prefix.candidates`, `prefix.reasons`, `prefix.question`

Copy:

| key | ru | en |
|---|---|---|
| candidatesLabel | 1. Какие ходы рассматривали? | 1. Which moves did you consider? |
| candidatesPlaceholder | Сделайте ходы на доске — они появятся здесь | Play the moves on the board, they appear here |
| reasonsLabel | 2. Что мешало выбрать? | 2. What held you back? |
| reasons.noPlan | Не видел плана | Couldn't see a plan |
| reasons.threat | Боялся угрозы соперника | Worried about a threat |
| reasons.calculation | Не смог досчитать | Couldn't calculate it |
| reasons.choice | Не мог выбрать между ходами | Couldn't choose between moves |
| questionLabel | 3. Что хотите спросить у тренера? (необязательно) | 3. What do you want to ask the coach? (optional) |
| questionPlaceholder | Например: почему не e5? | For example: why not e5? |
| prefix.candidates | Кандидаты: | Candidates: |
| prefix.reasons | Мешало: | Held me back: |
| prefix.question | Вопрос: | Question: |

In the composed message the reason labels are joined with ", " and their
first letter is lower-cased.

## Acceptance criteria

- [ ] A new question form shows the three steps; reply form and threads are unchanged
- [ ] Send is disabled with all steps empty, enabled when any step has content
- [ ] The sent message has one line per filled step, chips from step 1 stay clickable
- [ ] Reasons and step 3 text survive closing and reopening the form (draft)
- [ ] Both locales have the same keys
- [ ] Tests for `composeGuidedContent`, drafts and the form under `tests/`
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` passes
