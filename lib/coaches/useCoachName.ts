'use client';

import { useTranslations } from 'next-intl';
import type { CoachingMessage } from '@/lib/coaching/types';
import { coachDisplayName, type CoachProfile } from './displayName';

// Formats a coach profile with translated national titles (spec 020).
export function useCoachName(): (profile: CoachProfile) => string {
  const t = useTranslations('coaches.titles');
  return (profile) => coachDisplayName(profile, (title) => t(title));
}

// Section labels above an answer (spec 020): "Answer from IM Ivan Petrov"
// for the student; "Answered by …" or "Your response" for staff.
export function useAnswerLabels() {
  const t = useTranslations('coaches');
  const tCoaching = useTranslations('coaching');
  const tAdmin = useTranslations('coachingAdmin');
  const coachName = useCoachName();
  return {
    forStudent(answer?: Pick<CoachingMessage, 'author'>): string {
      return answer?.author
        ? t('answerFrom', { name: coachName(answer.author) })
        : tCoaching('coachResponse');
    },
    forStaff(
      answer: Pick<CoachingMessage, 'author' | 'author_id'> | undefined,
      viewerId?: string,
    ): string {
      if (!answer || !viewerId || answer.author_id === viewerId) {
        return tAdmin('yourResponse');
      }
      return answer.author
        ? t('answeredBy', { name: coachName(answer.author) })
        : t('answeredByCoach');
    },
  };
}
