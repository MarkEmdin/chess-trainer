'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckIcon, LanguagesIcon } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { updatePreferredLocale } from '@/lib/auth/profileActions';

const localeLabels: Record<(typeof routing.locales)[number], string> = {
  en: 'English',
  ru: 'Русский',
};

export default function LanguageToggle() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: (typeof routing.locales)[number]) => {
    if (next === locale) return;
    // Fire-and-forget: persists to user_profiles when signed in, no-op
    // for guests. Don't block the URL switch on the DB round-trip.
    void updatePreferredLocale(next);
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('toggleLanguage')}
          disabled={isPending}
        >
          <LanguagesIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((l) => (
          <DropdownMenuItem key={l} onClick={() => switchTo(l)}>
            <span className="flex-1">{localeLabels[l]}</span>
            {l === locale && <CheckIcon className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
