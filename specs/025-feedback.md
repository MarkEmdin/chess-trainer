# Spec: Feedback from users

Status: in-progress
Branch: feature/feedback

## Problem

Users have no way inside the site to report a bug, suggest something or say
that something is inconvenient. The owner hears about problems only in person,
and without the page or the device, which a phone bug often needs.

## Goal

Anyone can send a short message from the site, and it arrives in the Telegram
bot of every connected admin with the context needed to act on it.

## Non-goals

- Storing messages, a list in the admin area, statuses.
- Replying from the bot.
- Screenshots.
- A rate limit. Revisit if spam arrives.

## User-facing behavior

1. The footer on every page has a "Report a problem" button.
2. It opens a dialog: a type (bug, idea, inconvenient; bug is preselected), the
   text, and an optional contact.
3. Sending shows a thank-you in the dialog. Failing shows an error and keeps
   what was typed, because the message exists nowhere else.
4. Guests can send too. Text is required, up to 2000 characters.

## What arrives in Telegram

Type, text, sender (nickname and email, or "guest"), contact when given, page
and device (screen size and browser). In the admin's own locale.

## Data & types

No migration.

- `lib/feedback/types.ts`: `FEEDBACK_KINDS`, `MAX_FEEDBACK_LENGTH`.
- `lib/feedback/actions.ts`: server action `sendFeedback`.
- `lib/telegram/notify.ts`: `notifyAdminsOfFeedback`, which returns whether at
  least one admin got the message.

## UI

- `app/components/FeedbackDialog/index.tsx`, client component rendered from the
  server `Footer`. Controlled `open` with a plain trigger, per the known
  `asChild` hydration issue.

## i18n

New `feedback.*` namespace and `telegram.bot.feedback*` keys, in both locales.

## Decisions made without the user (check these)

- Guests can send.
- Spam protection is a hidden field that bots fill in. A filled one reports
  success and sends nothing.
- The contact field is free text, up to 100 characters.
- The button lives in the footer only, so it is not reachable from inside the
  coaching window.
- A failed delivery is an error to the user, since nothing is stored.

## Acceptance criteria

- [x] A signed-in user and a guest can send; admins get type, text, sender,
      contact, page and device.
- [x] Empty and too long text are refused.
- [x] A filled hidden field sends nothing and reports success.
- [x] No admin reached: the user sees an error and keeps the text.
- [x] HTML in the text is escaped.
- [x] `npm run lint`, `npm test`, `npm run build` pass.
- [ ] Manual check: a message arrives in the production bot.
