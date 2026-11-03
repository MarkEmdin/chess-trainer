// Titles a coach can claim (spec 020). FIDE titles render as their id;
// the Russian ones and "none" have translated labels (coaches.titles.*).
export const COACH_TITLES = [
  'GM',
  'IM',
  'FM',
  'CM',
  'WGM',
  'WIM',
  'WFM',
  'WCM',
  'MS',
  'CMS',
  'cat1',
  'none',
] as const;

export type CoachTitle = (typeof COACH_TITLES)[number];

export function isCoachTitle(value: unknown): value is CoachTitle {
  return COACH_TITLES.includes(value as CoachTitle);
}

// Titles shown by their translated label rather than the id.
export const NATIONAL_TITLES: readonly CoachTitle[] = ['MS', 'CMS', 'cat1'];
