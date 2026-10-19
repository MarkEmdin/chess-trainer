'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import type { Platform } from '@/lib/games/types';

type Props = {
  platform: Platform;
  onSubmit: (username: string) => void;
};

export default function UsernameForm({ platform, onSubmit }: Props) {
  const t = useTranslations('games.usernameForm');
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const labelKey = platform === 'chesscom' ? 'chesscomLabel' : 'lichessLabel';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md">
      <label
        htmlFor="platform-username"
        className="text-sm font-medium text-foreground"
      >
        {t(labelKey)}
      </label>
      <div className="flex gap-2">
        <Input
          id="platform-username"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('placeholder')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <Button type="submit" disabled={!input.trim()}>
          {t('submit')}
        </Button>
      </div>
    </form>
  );
}
