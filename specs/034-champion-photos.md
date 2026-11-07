# Spec: world champion photos

Status: done
Branch: feature/champion-photos

## Problem

The world champions page shows initials instead of photos, and the lessons card
calls the list "champions from the USSR" although it runs from Steinitz to
Kasparov.

## Goal

- Each of the 13 champions has a portrait, numbered in title order.
- The section is named for what it is: the first 13 world champions.
- Every photo credits its author, licence and source.
- Spassky's dates are current.

## Non-goals

Champions after Kasparov, reign dates, new lesson content.

## Acceptance criteria

- [x] Photos are freely licensed, cropped to the face and stored in `public/champions/`
- [x] `npm test`, `npm run lint` and `npm run build` pass
