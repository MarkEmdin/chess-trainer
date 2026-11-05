'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { HeartIcon } from 'lucide-react';
import { setResponseLiked } from '@/lib/coaching/actions';
import { cn } from '@/lib/utils';

type Props = { responseId: string; liked: boolean };

// Staff's like on an answer: on by default, they can take it away.
export default function ResponseLikeToggle({ responseId, liked }: Props) {
  const t = useTranslations('coachingAdmin');
  const [value, setValue] = useState(liked);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !value;
    setFailed(false);
    startTransition(async () => {
      try {
        const res = await setResponseLiked(responseId, next);
        if (res.error) setFailed(true);
        else setValue(next);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        aria-pressed={value}
        aria-label={value ? t('unlike') : t('like')}
        disabled={pending}
        onClick={toggle}
        className="inline-flex rounded p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <HeartIcon
          className={cn('size-4', value && 'fill-primary text-primary')}
        />
      </button>
      {failed && (
        <span role="alert" className="text-xs text-destructive">
          {t('likeFailed')}
        </span>
      )}
    </>
  );
}
