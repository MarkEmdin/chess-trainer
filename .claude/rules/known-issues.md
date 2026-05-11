# Known issues

Third-party bugs and version-conflict noise that we've deliberately decided not to fix. Don't relitigate when they surface — check this file first. Each entry says why a fix is deferred and what would trigger revisiting.

## `next-themes` `<script>` warning under React 19

**Symptom:** dev console logs

> Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client.

with the trace pointing at `app/components/ThemeProvider/index.tsx` (the `<NextThemesProvider>` line).

**Cause:** `next-themes@0.4.6` renders a `<script>` via `createElement('script', { dangerouslySetInnerHTML: ... })` to set `<html class="…">` *before* React hydrates — that's how it prevents theme-flash on first paint. The script is server-rendered, runs in the browser before hydration, and is legitimately needed. React 19 introduced a blanket warning for any `<script>` rendered through a component, ignoring `suppressHydrationWarning` on the element.

**Impact:** dev console only — production build does not surface this. Theme switching works correctly, no hydration mismatch, no real behavior change.

**Why we're not fixing it:**
- Patching `next-themes` from outside is messy
- Hand-rolling localStorage + inline-head-script re-solves what next-themes already battle-tested (cross-tab sync, system-pref listener, transition suppression during change). Trading a known-noise warning for ~50 lines of edge-case code is a bad deal
- It's an ecosystem issue between `next-themes` and React 19, tracked upstream

**Revisit when:** bumping `next-themes` past 0.4.6 — check release notes for the fix before assuming the warning is still present.
