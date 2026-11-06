export type VisibleArea = { top: number; bottom: number };

// How far to scroll so `item` is inside `area`: the caret between what is pinned
// around the text (spec 024), the current move inside its list.
export function scrollDelta(
  item: { top: number; bottom: number },
  area: VisibleArea,
): number {
  if (item.top < area.top) return item.top - area.top;
  if (item.bottom > area.bottom) return item.bottom - area.bottom;
  return 0;
}
