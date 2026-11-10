'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useStoredUsername } from '@/lib/chesscom/useStoredUsername';
import { useStoredLichessUsername } from '@/lib/lichess/useStoredLichessUsername';
import type { Platform } from '@/lib/games/types';
import PlatformToggle from '@/app/components/PlatformToggle';
import UsernameForm from '@/app/components/UsernameForm';

// The landing's way in (spec 036): the guest types their nickname here and
// lands straight on their key positions. Saving clears the other platform's
// nickname so /think-time opens the platform just chosen.
export default function LandingNickForm() {
  const t = useTranslations('home.form');
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>('chesscom');
  const [, setChesscom] = useStoredUsername();
  const [, setLichess] = useStoredLichessUsername();

  const submit = (nick: string) => {
    setChesscom(platform === 'chesscom' ? nick : null);
    setLichess(platform === 'lichess' ? nick : null);
    router.push('/think-time');
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <PlatformToggle value={platform} onChange={setPlatform} />
      <UsernameForm
        key={platform}
        platform={platform}
        onSubmit={submit}
        submitLabel={t('submit')}
      />
    </div>
  );
}
