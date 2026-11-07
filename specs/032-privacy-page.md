# Spec: privacy policy page

Status: done
Branch: feature/privacy-page

## Problem

Google won't publish the OAuth app for spec 031 without a privacy policy URL on
the production site.

## Goal

`/privacy` in both locales says what is stored, why, who else sees it and how
to remove it, and the footer links to it.

## Non-goals

Account deletion from the UI, a cookie banner, terms of service.

## Acceptance criteria

- [ ] Every data item matches what the app stores today
- [ ] Footer links to `/privacy`
- [ ] `npm test`, `npm run lint` and `npm run build` pass
