'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: Props) {
  const t = useTranslations('common.error');

  useEffect(() => {
    // Log to console for now — wire this to a reporting service (Sentry,
    // Vercel Analytics, etc.) when one is added.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center bg-background font-sans px-6 py-12">
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('title')}
        </h2>
        <p className="text-muted-foreground mb-6">{t('description')}</p>
        <Button onClick={reset}>{t('retry')}</Button>
      </div>
    </div>
  );
}
