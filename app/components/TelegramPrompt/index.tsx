'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import { setTelegramPromptDismissed } from '@/lib/telegram/actions';
import { useTelegramConnect } from '@/lib/telegram/useTelegramConnect';

// Offered right after a question is sent (spec 015). Stays up after "Don't
// remind me" so the student can still connect before closing the modal.
export default function TelegramPrompt() {
  const t = useTranslations('telegram');
  const { connect, pending, error } = useTelegramConnect();
  const [dismissed, setDismissed] = useState(false);

  // A failed save unticks the box so the student isn't told they opted out.
  function toggle(value: boolean) {
    setDismissed(value);
    setTelegramPromptDismissed(value)
      .catch(() => ({ ok: false }))
      .then(({ ok }) => {
        if (!ok) setDismissed(!value);
      });
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-muted/50 p-3 text-sm">
      <p>{t('prompt.text')}</p>
      <Button type="button" size="sm" disabled={pending} onClick={connect}>
        {t('prompt.connect')}
      </Button>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <label className="flex items-center gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={dismissed}
          onChange={(e) => toggle(e.target.checked)}
        />
        {t('prompt.dontRemind')}
      </label>
    </div>
  );
}
