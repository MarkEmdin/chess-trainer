# Spec: <feature name>

Status: draft | approved | in-progress | done
Branch: feature/<slug>

## Problem

What's missing or broken today. One paragraph.

## Goal

What "done" looks like, in user-observable terms. Not implementation detail.

## Non-goals

What this spec explicitly does not cover (prevents scope creep mid-implementation).

## User-facing behavior

Walk through the flow as the user experiences it. Include both locales if copy is user-facing.

## Data & types

- New/changed types (where they live: `lib/<feature>/types.ts`, `app/constants/...`)
- New SWR hook needed? Key shape, revalidation settings (see conventions.md `Data fetching`)
- Server actions / API routes involved

## UI

- New route under `app/[locale]/...`? Or existing component changes?
- Component shape: single (`index.tsx`) or feature folder (3+ coupled components)
- Server or Client component — note which hooks/browser APIs force `'use client'`

## i18n

- New translation namespace or keys under `messages/{en,ru}.json`
- List the keys here before implementation so both locale files stay structurally identical

## Open questions

Anything that needs a decision before/during implementation. Delete this section once resolved.

## Acceptance criteria

- [ ] Behavior X works for input Y
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` passes
- [ ] Tests added under `tests/<mirrored path>` for new logic/components
