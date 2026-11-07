'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

export default function NicknameStrip() {
  const t = useTranslations('auth.chooseNickname');
  const pathname = usePathname();

  if (pathname === '/choose-nickname') return null;

  return (
    <div className="border-t border-border bg-primary/10 px-4 py-2 text-center text-sm">
      <Link
        href="/choose-nickname"
        className="text-foreground underline hover:no-underline"
      >
        {t('strip')}
      </Link>
    </div>
  );
}
