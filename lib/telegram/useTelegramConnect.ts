'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { startTelegramLink } from './actions';

// Shared by the profile section and the post-question prompt.
export function useTelegramConnect() {
  const t = useTranslations('telegram');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  function connect() {
    // Open the tab synchronously: after an await mobile browsers block it.
    const tab = window.open('', '_blank');
    setError(null);
    startTransition(async () => {
      let result;
      try {
        result = await startTelegramLink();
      } catch {
        result = { error: t('errors.connectFailed') };
      }
      if ('error' in result) {
        tab?.close();
        setError(result.error);
        return;
      }
      if (tab) {
        tab.opener = null;
        tab.location.href = result.url;
      } else window.location.href = result.url;
      setStarted(true);
    });
  }

  return { connect, pending, started, error, startTransition };
}
