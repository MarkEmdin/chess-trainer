# Conventions

## File & directory layout

- App Router only. Routes live under `app/[locale]/<segment>/page.tsx`. No `pages/` directory.
- All UI is under `app/[locale]/` — root layout responsibility was moved into `app/[locale]/layout.tsx` (it owns `<html>`/`<body>`/`<lang>` and wraps with `ThemeProvider` + `NextIntlClientProvider`). There is no separate `app/layout.tsx`.
- Components live in `app/components/<PascalCaseName>/`. Two shapes are accepted:
  - **Single component:** `<Name>/index.tsx`, default export. Most components.
  - **Feature folder:** multiple tightly-coupled components grouped under `<Feature>/` with `index.tsx` as the public entry; siblings (`UsernameForm.tsx`, `GamesList.tsx`, `GameModal.tsx`) are internal and never imported from outside the folder. Reserve for 3+ components that only make sense together (e.g. `ChessComGames`).
  Why: feature folders keep related code colocated, but only when there's enough material to justify grouping.
- shadcn/ui primitives live in `app/components/ui/`. See the path-scoped rule that activates when editing those files.
- Static data lives in `app/constants/<name>.ts` as typed exports. The text fields in these (names, descriptions, titles) are translation **keys**, not the strings themselves — actual translations live in `messages/{en,ru}.json`. Keep only `id` / `points` / `image` / `video` / URLs in constants.
- Shared utilities and integrations live in `lib/`. Examples: `lib/utils.ts` (the `cn` helper), `lib/chesscom/` (API client + types + React hooks for the Chess.com integration). Feature subfolders bundle framework-agnostic API code alongside the hooks that consume it.
- Routing-aware navigation lives in `i18n/`: `routing.ts` (locales config), `request.ts` (next-intl request config), `navigation.ts` (locale-aware `Link` / `useRouter` / `usePathname`).
- Middleware lives in `proxy.ts` at project root. **Not** `middleware.ts` — Next.js 16 renamed the convention.

## Imports

- Use the `@/*` alias for anything outside the current component folder. Relative imports (`./`, `../`) are fine for files inside the same component or feature folder.
- For locale-aware internal links, import `Link` / `useRouter` / `usePathname` from `@/i18n/navigation`, never from `next/link` or `next/navigation`. The aliased versions preserve the active locale prefix.

## Styling

- Tailwind CSS **v4**. There is no `tailwind.config.js` — config lives in `app/globals.css` via `@theme` / CSS variables. Don't create a JS config file.
- The project supports three themes (`light`, `dark`, `rose`) via `next-themes`. Use shadcn semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`, `text-destructive`, `border-border`, etc.) so colors swap with the active theme. Don't hardcode hex values or `stone-*`/`white`/`black` for surfaces and text. Hover/focus states should use token-relative opacity: `hover:bg-primary/90`, `hover:border-foreground/40`, `hover:border-destructive/50`.
- Universal-semantic colors (`text-green-600` for correct, etc.) can stay raw when the meaning doesn't depend on theme — but prefer `text-destructive` over `text-red-500` whenever it represents the "bad" state, since the destructive token already adapts.
- Merge conditional classes with `cn()` from `@/lib/utils`, never with raw template strings or a third-party `classnames`.

## React / Next.js

- Server Components by default. Add `'use client'` only when the file uses hooks, browser APIs, or event handlers.
- This is Next.js 16 — see `AGENTS.md`. When in doubt, read the relevant guide in `node_modules/next/dist/docs/` before guessing an API. Notable Next 16 changes already in play: `middleware.ts` → `proxy.ts`, `params` is `Promise<...>` and must be awaited, `PageProps<'/[seg]'>` is a global type helper.

## TypeScript

- `strict: true` is on. Don't silence errors with `any` or `// @ts-ignore`; fix the type. If you genuinely need an escape hatch, use `// @ts-expect-error <reason>` so it surfaces if it stops being needed.

## i18n

- All user-facing copy goes through next-intl. Server components: `getTranslations('namespace')`. Client components: `useTranslations('namespace')`. Date/number formatting: `useFormatter()` / `format.dateTime(...)`.
- Translation strings live in `messages/{en,ru}.json` under topic namespaces (`nav`, `home`, `theory`, `champions`, `pieces`, `pieceValues`, `games`, `common`, `metadata`, etc.). Keep both files structurally identical — same key tree, different values.
- Brand name "Chess Fundamentals" is the explicit exception: left as a literal in both locales, not a translation key.
- For features with their own UI surface (forms, modals, lists), put strings under one feature namespace (e.g. `games.usernameForm.*`, `games.modal.*`). Don't sprinkle generic keys into `common` unless they're genuinely reusable across features.
- Page `<title>`/`<meta>` come from `generateMetadata` (async function in the layout/page), not the static `metadata` const, when the description needs translation.

## Data fetching

- Use [SWR](https://swr.vercel.app/) for client-side reads. Wrap calls in a custom hook under `lib/<feature>/` so the call site stays domain-typed (`useChessComGames(username)` → `{ games, error, isLoading, isNotFound }`), not generic. See `lib/chesscom/useChessComGames.ts` for the template.
- Key shape is a typed tuple — first element is a string discriminator, second+ are the params. This namespaces cache keys across features and dedupes identical requests across routes (e.g. `/games` and `/think-time` share one fetch per username).
- For data that doesn't change after the fact (game archives, finished games), turn off `revalidateOnFocus` and `revalidateOnReconnect`. Leave `revalidateIfStale` at its default — it acts as a free retry on remount when the cached state is an error.
