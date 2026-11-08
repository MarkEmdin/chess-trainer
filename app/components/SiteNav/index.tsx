'use client';

import { useTranslations } from 'next-intl';
import {
  CircleHelpIcon,
  CrosshairIcon,
  GraduationCapIcon,
  LayoutGridIcon,
  type LucideIcon,
  TrophyIcon,
} from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import LinkPending from '@/app/components/LinkPending';
import { cn } from '@/lib/utils';
import { SHOW_LESSONS } from '@/lib/site';

type NavLink = {
  href: string;
  key: 'positions' | 'games' | 'learn' | 'leaderboard' | 'help';
  Icon: LucideIcon;
};

const links = (
  [
    { href: '/think-time', key: 'positions', Icon: CrosshairIcon },
    { href: '/games', key: 'games', Icon: LayoutGridIcon },
    { href: '/lessons', key: 'learn', Icon: GraduationCapIcon },
    { href: '/leaderboard', key: 'leaderboard', Icon: TrophyIcon },
    { href: '/tutorial', key: 'help', Icon: CircleHelpIcon },
  ] satisfies NavLink[]
).filter(({ key }) => SHOW_LESSONS || key !== 'learn');

// The sections fit inline on desktop; under `lg` the same links move to a
// fixed bottom tab bar (the body reserves room for it in the layout).
export default function SiteNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <ul
        data-testid="site-nav-desktop"
        className="hidden lg:flex items-center gap-6"
      >
        {links.map(({ href, key }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'flex items-center gap-1 py-1 text-sm transition-colors',
                isActive(href)
                  ? 'font-semibold text-foreground shadow-[inset_0_-2px_0_var(--primary)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(key)}
              <LinkPending />
            </Link>
          </li>
        ))}
      </ul>

      <nav
        aria-label={t('main')}
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card"
      >
        <ul className="flex justify-around">
          {links.map(({ href, key, Icon }) => (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive(href) ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 py-2 text-[11px]',
                  isActive(href)
                    ? 'font-semibold text-primary'
                    : 'text-muted-foreground',
                )}
              >
                <Icon aria-hidden className="size-5" />
                {t(key)}
                <LinkPending className="absolute top-1.5 right-3" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
