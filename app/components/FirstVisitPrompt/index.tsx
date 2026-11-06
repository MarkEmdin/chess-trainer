'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { GraduationCapIcon, XIcon } from 'lucide-react';
import { buttonVariants } from '@/app/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { useTutorialSeen } from '@/lib/tutorial/useTutorialSeen';

const TUTORIAL = '/tutorial';

// Offers the tutorial once per browser (spec 027).
export default function FirstVisitPrompt() {
  const t = useTranslations('tutorial.prompt');
  const [seen, markSeen] = useTutorialSeen();
  const onTutorial = usePathname() === TUTORIAL;

  useEffect(() => {
    if (onTutorial) markSeen();
  }, [onTutorial, markSeen]);

  if (seen || onTutorial) return null;

  return (
    <div className="border-b border-border bg-primary/10">
      <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 py-2 text-sm sm:px-6">
        <GraduationCapIcon
          aria-hidden
          className="hidden size-5 shrink-0 text-primary sm:block"
        />
        <p className="flex-1 text-foreground">{t('text')}</p>
        <Link
          href={TUTORIAL}
          className={buttonVariants({ size: 'sm' })}
          onClick={markSeen}
        >
          {t('open')}
        </Link>
        <button
          type="button"
          aria-label={t('close')}
          className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={markSeen}
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
