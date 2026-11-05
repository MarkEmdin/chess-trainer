import { useTranslations } from 'next-intl';
import { HeartIcon } from 'lucide-react';
import type { CoachingMessage } from '@/lib/coaching/types';

// Tells a student the coach liked their question. Nothing unless liked is
// explicitly true (questions and old data carry no flag).
export default function LikedMark({ message }: { message: CoachingMessage }) {
  const t = useTranslations('coachingPage');
  if (message.liked !== true) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-primary">
      <HeartIcon className="size-3.5 fill-primary" />
      {t('liked')}
    </span>
  );
}
