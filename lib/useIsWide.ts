import { useSyncExternalStore } from 'react';

// Tailwind's `lg` breakpoint.
const QUERY = '(min-width: 64rem)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

// For layout that CSS can't express. Only for client-rendered UI: the server
// snapshot assumes a wide screen.
export function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}
