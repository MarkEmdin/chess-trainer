'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { ThumbsUpIcon } from 'lucide-react';
import { setResponseLiked } from '@/lib/coaching/actions';
import { cn } from '@/lib/utils';

type Props = { responseId: string; liked: boolean };

// Staff's like on an answer: on by default, they can take it away.
export default function ResponseLikeToggle({ responseId, liked }: Props) {
  const t = useTranslations('coachingAdmin');
  // Shows the tap at once. The action refreshes the page, which can take a
  // while; when it ends `liked` is the server's answer, also after a failure.
  const [value, setValue] = useOptimistic(liked);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !value;
    setFailed(false);
    startTransition(async () => {
      setValue(next);
      try {
        const res = await setResponseLiked(responseId, next);
        if (res.error) setFailed(true);
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
        onClick={toggle}
        className="inline-flex rounded p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ThumbsUpIcon
          className={cn('size-5', value && 'fill-primary text-primary')}
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
