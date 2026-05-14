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

## `radix-ui` `asChild` hydration mismatch (Slot + SSR)

**Symptom:** when an `asChild` pattern from the `radix-ui` barrel package nests through multiple Slot layers (e.g. `<SheetTrigger asChild><Button>...</Button></SheetTrigger>` or `<SheetClose asChild><Link>...</Link></SheetClose>`) and the parent tree is server-rendered, React 19 reports a hydration mismatch where the inner element is missing on the server side. Visually: drawer opens but nav links are blank, or a console "Hydration failed" appears with the diff pointing at our `Button` inside the trigger.

**Cause:** the `radix-ui@1.4.3` barrel's `Slot.Root` composition doesn't always produce byte-identical output across SSR and client when the asChild chain goes `SheetTrigger → DialogTrigger → Primitive.button (Slot) → our Button`. Adding `next-themes`' inline `<script>` (see issue above) as a sibling seems to compound the offsets.

**Impact:** dev console errors; in extreme cases (SheetClose + Link) the inner element doesn't render server-side and the drawer is empty until JS hydrates.

**Workaround:**
- For triggers: drop `asChild`, render the trigger as its own element and apply shadcn styling via `cn(buttonVariants(...), ...)` on the className. See `app/components/MobileNav/index.tsx` for the trigger.
- For close-wrapped children (`SheetClose asChild` around an interactive child): lift the open state to React via `useState` + `<Sheet open onOpenChange>` and call `setOpen(false)` from each child's own `onClick`. See the same MobileNav for the close pattern.

**Revisit when:** updating past `radix-ui@1.4.3` — verify against a minimal Sheet/Trigger reproducer before re-introducing asChild.
