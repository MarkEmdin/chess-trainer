# Conventions

## File & directory layout

- App Router only. Routes live under `app/<segment>/page.tsx`. No `pages/` directory.
- Components live in `app/components/<PascalCaseName>/index.tsx` — one folder per component, default export.
  Why: keeps room for colocated helpers/styles/types per component without polluting a flat directory.
- shadcn/ui primitives live in `app/components/ui/`. See the path-scoped rule that activates when editing those files.
- Static data (lessons, pieces, champions, theory sections) lives in `app/constants/<name>.ts` as typed exports. Pages import from there instead of inlining arrays.
- Shared utilities live in `lib/`. Currently only `cn()` from `lib/utils.ts`.

## Imports

- Use the `@/*` alias for anything outside the current component folder. Relative imports (`./`, `../`) are fine for files inside the same component folder.
- shadcn-generated files already use `@/app/components/ui/...` and `@/lib/utils` — match that style.

## Styling

- Tailwind CSS **v4**. There is no `tailwind.config.js` — config lives in `app/globals.css` via `@theme` / CSS variables. Don't create a JS config file.
- Merge conditional classes with `cn()` from `@/lib/utils`, never with raw template strings or `classnames`.
- Project palette skews stone/neutral on a `bg-[#f5f0e8]` page background. Prefer existing color tokens (`stone-*`, `muted`, `muted-foreground`) over introducing new ones.

## React / Next.js

- Server Components by default. Add `'use client'` only when the file actually uses hooks, browser APIs, or event handlers.
- This is Next.js 16 — see `AGENTS.md`. When in doubt, check `node_modules/next/dist/docs/` before guessing an API.

## TypeScript

- `strict: true` is on. Don't silence errors with `any` or `// @ts-ignore`; fix the type. If you genuinely need an escape hatch, use `// @ts-expect-error <reason>` so it surfaces if it stops being needed.

## Content language

- UI copy is a mix of English and Russian (chess training is the domain, much of the source material is Russian). Match the language already used in the surrounding component — do not translate existing strings without being asked.
