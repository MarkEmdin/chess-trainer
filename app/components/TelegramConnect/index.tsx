'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import { disconnectTelegram, startTelegramLink } from '@/lib/telegram/actions';

type Props = { connected: boolean; isAdmin: boolean };

export default function TelegramConnect({ connected, isAdmin }: Props) {
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
      }
      else window.location.href = result.url;
      setStarted(true);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <p className="text-sm text-muted-foreground">
        {t(isAdmin ? 'descriptionAdmin' : 'descriptionStudent')}
      </p>
      {connected ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{t('connected')}</span>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => disconnectTelegram())}
          >
            {t('disconnect')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <Button type="button" disabled={pending} onClick={connect}>
            {t('connect')}
          </Button>
          {started && (
            <p className="text-sm text-muted-foreground">{t('pendingHint')}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
