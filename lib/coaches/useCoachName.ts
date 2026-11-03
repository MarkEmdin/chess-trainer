'use client';

import { useTranslations } from 'next-intl';
import { coachDisplayName, type CoachProfile } from './displayName';

// Formats a coach profile with translated national titles (spec 020).
export function useCoachName(): (profile: CoachProfile) => string {
  const t = useTranslations('coaches.titles');
  return (profile) => coachDisplayName(profile, (title) => t(title));
}
