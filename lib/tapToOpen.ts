import type { MouseEvent } from 'react';

// Click handler for a card whose whole surface opens something (spec: tap
// anywhere on a coaching card to open the thread, easier on phones). Clicks
// on the card's own buttons and links keep their own action, and selecting
// text doesn't count as a tap. React bubbles events out of portals, so
// clicks inside an opened modal are ignored too.
export function tapToOpen(open: () => void) {
  return (e: MouseEvent<HTMLElement>) => {
    const target = e.target as Element;
    if (!e.currentTarget.contains(target)) return;
    if (target.closest('a, button, input, textarea, [role="dialog"]')) return;
    if (window.getSelection()?.toString()) return;
    open();
  };
}
