import { NATIONAL_TITLES, type CoachTitle } from './titles';

// A coach's public signature (coach_profiles row).
export type CoachProfile = {
  first_name: string;
  last_name: string;
  title: CoachTitle;
};

// "IM Ivan Petrov"; national titles go through `titleLabel` (translations).
export function coachDisplayName(
  profile: CoachProfile,
  titleLabel: (title: CoachTitle) => string,
): string {
  const name = `${profile.first_name} ${profile.last_name}`;
  if (profile.title === 'none') return name;
  const title = NATIONAL_TITLES.includes(profile.title)
    ? titleLabel(profile.title)
    : profile.title;
  return `${title} ${name}`;
}
