# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home page with a landing page that explains the project idea (self-analysis of key positions without an engine), how it works, what's available, and what's coming.

**Architecture:** One Server Component (`app/[locale]/page.tsx`) rendering four sections from local `as const` arrays; all copy in the `home` namespace of `messages/{en,ru}.json`. A message-parity test guards that both locale files keep identical key trees.

**Tech Stack:** Next.js 16 App Router, next-intl, Tailwind v4, shadcn `Card` / `buttonVariants`, Jest + RTL.

**Spec:** `specs/007-landing-page.md`

## Global Constraints

- Brand "Chess Fundamentals" stays a literal, not a translation key.
- Semantic tokens only (`bg-background`, `bg-card`, `text-muted-foreground`, `bg-primary`, `border-border`); conditional classes via `cn()`.
- `Link` from `@/i18n/navigation`, never `next/link`.
- No new dependencies, routes or component folders.
- `npm run lint` zero warnings; `npm test` and `npm run build` pass.

## Review Focus

1. Phone width (375px): CTAs and the card grid must wrap, no horizontal scroll — grid is 1 column below `sm`, buttons `flex-wrap`.
2. Rose/dark themes: no raw colors — reviewer greps the page for `stone-|white|black|#`.
3. Logged-out click on the Coaching card: lands on login via the existing `/coaching` redirect, no new handling needed.
4. Russian copy is longer: card titles like «Важные позиции из партий» must wrap, not overflow — no `truncate`/`whitespace-nowrap`.
5. Removed keys (`home.subtitle`, `home.description`, `home.startLearning`) must have no remaining users — `grep -rn "startLearning" app` returns nothing.

---

### Task 1: Message parity guard

**Files:**
- Test: `tests/messages.test.ts`

**Interfaces:**
- Produces: a test that fails whenever `messages/en.json` and `messages/ru.json` key trees differ.

- [ ] **Step 1: Write the test** `en and ru messages have identical key trees` — flatten both JSON files into sorted dotted-path arrays and `expect(ruKeys).toEqual(enKeys)`.
- [ ] **Step 2: Run** `npx jest tests/messages.test.ts` — expected PASS (parity holds today; this is a regression guard, verified by temporarily deleting one ru key and seeing it FAIL, then restoring).
- [ ] **Step 3: Commit** `test: guard en/ru message key parity`

### Task 2: Landing page

**Files:**
- Modify: `app/[locale]/page.tsx` (full rewrite)
- Modify: `messages/en.json`, `messages/ru.json` (`home` namespace replaced, `metadata.description` updated)
- Test: `tests/app/page.test.tsx`

**Interfaces:**
- Consumes: `getTranslations` from `next-intl/server`; `Card`, `CardContent`, `CardTitle`, `CardDescription` from `@/app/components/ui/card`; `buttonVariants` from `@/app/components/ui/button`.
- Produces: `export default async function Home(): Promise<JSX.Element>`.

- [ ] **Step 1: Write failing tests** in `tests/app/page.test.tsx`, mocking `next-intl/server` (`getTranslations` → `` (key) => `home.${key}` ``) and `@/i18n/navigation` `Link` → `<a>`, as in `tests/app/email-confirmed/page.test.tsx`:
  - `shows the brand and the project idea` — heading level 1 named `Chess Fundamentals`; text `home.tagline` and `home.idea` present.
  - `primary CTA leads to key positions, secondary to lessons` — link `home.ctaPrimary` has `href="/think-time"`, link `home.ctaSecondary` has `href="/lessons"`.
  - `explains how it works in three steps` — heading `home.howItWorks.title`; a list containing exactly 3 items, with texts `home.howItWorks.find.title`, `.think.title`, `.discuss.title`.
  - `links every feature card` — links by name containing `home.features.<key>.title` with hrefs: keyPositions `/think-time`, games `/games`, coaching `/coaching`, lessons `/lessons`.
  - `announces discussion with other players as coming soon` — heading `home.future.title`, text `home.future.description`.
- [ ] **Step 2: Run** `npx jest tests/app/page.test.tsx` — expected FAIL (old page has none of these keys).
- [ ] **Step 3: Replace the `home` namespace and `metadata.description`** with the exact copy below (both files, same key tree).
- [ ] **Step 4: Rewrite `app/[locale]/page.tsx`.** Sections in order: hero (♔, `<h1>` brand, tagline, idea, CTAs — primary `buttonVariants({ size: 'lg' })`, secondary `buttonVariants({ variant: 'outline', size: 'lg' })`); how-it-works `<ol>` of three numbered steps; features grid `grid gap-4 sm:grid-cols-2` of linked `Card`s (pattern of `app/[locale]/lessons/page.tsx`); coming-soon block as a dashed-border muted panel. Each section has an `<h2>`. Container `max-w-4xl mx-auto px-6 py-12`.
- [ ] **Step 5: Run** `npx jest tests/app/page.test.tsx tests/messages.test.ts` — expected PASS.
- [ ] **Step 6: Commit** `feat: landing page with project idea and features`

#### Copy — `messages/en.json`

```json
"home": {
  "tagline": "Learn to think through chess positions on your own.",
  "idea": "This project helps beginner players analyze positions themselves — without engine help. Find the moments in your own games where you thought the longest, work out what was going on, and put your ideas into words. Then discuss them with a coach — and soon with other players too.",
  "ctaPrimary": "Find my key positions",
  "ctaSecondary": "Learning materials",
  "howItWorks": {
    "title": "How it works",
    "find": { "title": "Bring your games", "text": "Enter your Chess.com or Lichess username — your recent games load automatically." },
    "think": { "title": "Think it through yourself", "text": "Key Positions shows the moves you spent the most time on. Open one, look for candidate moves and plans, and write down your reasoning — no engine." },
    "discuss": { "title": "Discuss with a coach", "text": "Send your analysis to a coach on the platform and get a reply with comments and variations." }
  },
  "features": {
    "title": "What you can do here",
    "keyPositions": { "title": "Key Positions", "description": "Positions from your games where you thought for a long time — the best material for self-analysis." },
    "games": { "title": "Games", "description": "Your recent Chess.com and Lichess games, with a board to replay every move." },
    "coaching": { "title": "My coaching", "description": "Your questions to coaches: your analysis, their replies and suggested variations." },
    "lessons": { "title": "Learning materials", "description": "Theory, piece values and world champions. Currently in Russian only." }
  },
  "future": {
    "title": "Coming soon",
    "description": "Discuss your analysis with other players — compare ideas on the same position and learn from each other."
  }
}
```

`metadata.description`: `"Learn to analyze chess positions yourself — find the key moments in your games and discuss them with a coach."`

#### Copy — `messages/ru.json`

```json
"home": {
  "tagline": "Учитесь разбирать шахматные позиции самостоятельно.",
  "idea": "Проект помогает начинающим шахматистам анализировать позиции самим — без компьютерной помощи. Находите в своих партиях моменты, где вы думали дольше всего, разбирайтесь, что происходило, и учитесь формулировать свои идеи. Затем обсуждайте их с тренером — а скоро и с другими игроками.",
  "ctaPrimary": "Найти мои важные позиции",
  "ctaSecondary": "Обучающие материалы",
  "howItWorks": {
    "title": "Как это работает",
    "find": { "title": "Подключите свои партии", "text": "Введите ник на Chess.com или Lichess — последние партии загрузятся автоматически." },
    "think": { "title": "Подумайте сами", "text": "В разделе «Важные позиции из партий» собраны ходы, над которыми вы думали дольше всего. Откройте позицию, найдите ходы-кандидаты и планы и запишите свои рассуждения — без движка." },
    "discuss": { "title": "Обсудите с тренером", "text": "Отправьте свой анализ тренеру платформы и получите ответ с комментариями и вариантами." }
  },
  "features": {
    "title": "Что здесь можно делать",
    "keyPositions": { "title": "Важные позиции из партий", "description": "Позиции из ваших партий, где вы долго думали, — лучший материал для самостоятельного анализа." },
    "games": { "title": "Партии", "description": "Ваши последние партии с Chess.com и Lichess с доской, чтобы просмотреть каждый ход." },
    "coaching": { "title": "Мои вопросы", "description": "Ваши вопросы тренерам: ваш анализ, их ответы и предложенные варианты." },
    "lessons": { "title": "Обучающие материалы", "description": "Теория, ценность фигур и чемпионы мира." }
  },
  "future": {
    "title": "Скоро",
    "description": "Обсуждайте свой анализ с другими игроками — сравнивайте идеи в одной позиции и учитесь друг у друга."
  }
}
```

`metadata.description`: `"Учитесь самостоятельно анализировать шахматные позиции — находите ключевые моменты в своих партиях и обсуждайте их с тренером."`

### Task 3: Verify and finish

- [ ] `npm run lint` — zero warnings
- [ ] `npm test` — all pass
- [ ] `npm run build` — succeeds
- [ ] Visual check `/en` and `/ru` at 375px and desktop, light/dark/rose
- [ ] Mark spec `Status: done`; commit `docs: spec 007 landing page`
- [ ] `superpowers:finishing-a-development-branch`
