# Specs

Spec-driven workflow for this project.

## Flow

1. Copy `TEMPLATE.md` to `<number>-<slug>.md` (e.g. `001-puzzle-rush.md`)
2. Fill it in, resolve "Open questions" with the user before writing code
3. Create branch `feature/<slug>`
4. Implement against the spec; spec and code merge to `main` together in the same PR
5. Mark spec `Status: done` in the same PR

Specs live in the branch until merged — don't write a spec on `main` for work that isn't happening yet.

## Numbering

Sequential, never reused. Check the highest existing number before creating a new one.
