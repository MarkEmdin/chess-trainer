'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import type { Platform } from '@/lib/games/types';

type Props = {
  value: Platform;
  onChange: (platform: Platform) => void;
};

const PLATFORMS: Platform[] = ['chesscom', 'lichess'];

export default function PlatformToggle({ value, onChange }: Props) {
  const t = useTranslations('games.platformToggle');

  return (
    <div className="flex gap-2" role="tablist">
      {PLATFORMS.map((platform) => (
        <Button
          key={platform}
          type="button"
          variant={value === platform ? 'default' : 'outline'}
          size="sm"
          role="tab"
          aria-selected={value === platform}
          onClick={() => onChange(platform)}
        >
          {t(platform)}
        </Button>
      ))}
    </div>
  );
}
