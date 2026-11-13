# Monthly Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leaderboard counts the last 30 days, loses its subtitle, and shows places 1-3 as podium cards.

**Architecture:** One SQL migration redefines the existing `weekly_leaderboard()` RPC with a 30-day window. The `Leaderboard` server component splits rows into podium (rows with a cup) and the rest. Copy changes in both locale files.

**Tech Stack:** Next.js 16, next-intl, Tailwind v4, Supabase SQL, Jest + RTL.

**Spec:** `specs/037-monthly-leaderboard.md`

## Global Constraints

- Window: `interval '30 days'`, rolling. RPC name `weekly_leaderboard` stays.
- Players with 0 likes are always listed; nothing collapses.
- `messages/en.json` and `messages/ru.json` keep the same key tree.
- Theme tokens only, except the existing cup colours in `CUP_COLOR`.

## Review Focus

- Ties at place 2 or 3 → every tied player gets a podium card (grid wraps). Test in Task 2.
- Everyone at 0 likes → no podium, all rows in the list. Existing test "gives no cup without a position" plus assert no podium list.
- Own row on the podium → card outlined, label "You". Test in Task 2.
- Long nickname on a podium card at phone width → truncates, no horizontal scroll. Check by eye at 360px.

---

### Task 1: 30-day window

**Files:**
- Create: `supabase/migrations/20261113120000_leaderboard_month.sql`

- [ ] **Step 1:** Copy the function from `supabase/migrations/20261106130000_leaderboard_everyone.sql` with `interval '30 days'` and a header comment: window is now 30 days; name kept so the running app keeps working between `db push` and deploy.
- [ ] **Step 2: Commit** `feat: count leaderboard likes over 30 days`

### Task 2: Podium, no subtitle, monthly copy

**Files:**
- Modify: `app/components/Leaderboard/index.tsx`
- Modify: `app/[locale]/leaderboard/page.tsx` (drop `subtitle`)
- Modify: `messages/en.json`, `messages/ru.json`
- Test: `tests/app/components/Leaderboard/index.test.tsx`, `tests/app/leaderboard/page.test.tsx`

**Interfaces:** `Leaderboard({ rows: LeaderboardRow[] })` unchanged.

- [ ] **Step 1: Write failing tests**
  - `puts places 1-3 with likes on the podium`: rows `r(1,'A',7), r(2,'B',5), r(2,'C',5), r(4,'D',3)` → `getByRole('list', { name: 'Top places' })` contains A, B, C; D is not inside it.
  - `no podium when nobody has a like`: rows all 0 → `queryByRole('list', { name: 'Top places' })` is null; both names visible.
  - `marks own podium card`: `r(1,'Me',3,true)` → `getByText('You').closest('li')` has `aria-current="true"`.
  - `shows the hint`: text `A coach likes a good question. One like is one position.`
  - Empty-state test expects `No likes yet this month. Ask a coach a good question!`
- [ ] **Step 2:** Run `npm test -- Leaderboard` → FAIL.
- [ ] **Step 3: Implement.** Podium = `<ol aria-label={t('podium')}>` grid `grid-cols-3 gap-2`, each card a `li` with cup (size-7), nickname truncated, count. Rest = existing row list. Hint `<p className="text-sm text-muted-foreground">` under the list. Strings:
  - en: `title` "Leaderboard of the month", `empty` "No likes yet this month. Ask a coach a good question!", `hint` "A coach likes a good question. One like is one position.", `podium` "Top places"; remove `subtitle`; about leaderboard text "…the most liked players of the month get to the top."
  - ru: `title` "Лидерборд месяца", `empty` "В этом месяце лайков пока нет. Задайте тренеру хороший вопрос!", `hint` "Тренер ставит лайк за хороший вопрос. Один лайк — одна позиция.", `podium` "Лучшие места"; remove `subtitle`; about text "…самые отмеченные игроки месяца попадают наверх."
- [ ] **Step 4:** `npm test`, `npm run lint`, `npm run build` → all pass.
- [ ] **Step 5: Commit** `feat: monthly leaderboard with a podium`
