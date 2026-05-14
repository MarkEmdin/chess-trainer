# Chess Fundamentals

A chess training app: explore the World Champions, learn basic checkmates and tactics, train piece-value intuition, and analyze your own Chess.com games — including the positions where you took longest to decide.

## Features

- **Theory** — basic checkmate patterns (two rooks, queen, rook, windmill) with explainer videos and direct links to Lichess practice trainers.
- **Piece Values** — drag-free puzzle: pick the combination of pieces whose point values sum to a random target.
- **World Champions** — bios of the thirteen World Champions from Steinitz to Kasparov, each with a photo and a lecture video.
- **Chess.com Games** — enter any username, browse the last 10 games as cards (white vs black, result, time class, date), click one to replay it move by move on an interactive board with live clocks and per-move think time.
- **Long Moves** — across the loaded games, surface every position where the user spent more than the configured threshold thinking (default 45s, adjustable from a preset picker). Sorted by time descending. The mini-board on each card highlights the opponent's last move so you immediately see what you were responding to. Click any card to open that exact half-move in the full replay.

## UX

- **Three themes:** light, dark, and a custom rose palette (default).
- **Two languages:** English and Russian, URL-prefixed (`/en/...`, `/ru/...`), locale auto-detected from `Accept-Language` with a manual switcher in the header.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4 (CSS-first config), shadcn/ui primitives
- **Theming:** `next-themes` (light / dark / rose)
- **i18n:** `next-intl` with locale-prefixed routing — `[locale]` segment + `proxy.ts` middleware (Next.js 16's renamed `middleware.ts`)
- **Chess:** `chess.js` (PGN parsing, move replay) + `react-chessboard` v5 (board rendering)
- **Icons:** `lucide-react`
- **Data:** Chess.com Public API (no auth, client-side fetch) wrapped in [SWR](https://swr.vercel.app/)-backed custom hooks with typed tuple cache keys — the same username fetched on `/games` and `/think-time` resolves to a single network call
