# Chess Fundamentals

[![CI](https://github.com/MarkEmdin/chess-trainer/actions/workflows/ci.yml/badge.svg)](https://github.com/MarkEmdin/chess-trainer/actions/workflows/ci.yml)

Interactive chess learning platform built with Next.js, React, and TypeScript.

The project combines my background as a former competitive chess player and coach (2250 FIDE) with modern frontend development and AI-assisted workflows.

## Live Demo

[chess-trainer-amber.vercel.app/en](https://chess-trainer-amber.vercel.app/en)

## Features

- **Theory** — basic checkmate patterns with explainer videos and Lichess practice links
- **Piece Values** — puzzle: pick the combination of pieces whose point values sum to a random target
- **World Champions** — bios and lecture videos from Steinitz to Kasparov
- **Chess.com Games** — load any player's last 10 games and replay them move by move with live clocks and per-move think time
- **Key Positions** — surface every position where the user spent more than the configured threshold thinking, sorted by time; users can send their own analysis of these to a platform coach and get a reply
- Three themes (light / dark / rose) and two languages (English / Russian), URL-prefixed with auto-detect

> Note: part of the educational video content is in Russian only.

## Tech Stack

- Next.js 16 (App Router, Turbopack), React 19
- TypeScript (strict mode)
- Tailwind CSS 4, shadcn/ui
- next-intl for locale-prefixed routing
- Supabase — auth and Postgres database (backend)
- SWR for client-side data fetching
- chess.js + react-chessboard
- Jest + React Testing Library
- Vercel hosting, GitHub Actions CI
- Built with Claude Code (AI-assisted development)
