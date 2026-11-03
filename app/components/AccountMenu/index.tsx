'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buttonVariants } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth/actions';
import { isStaff, type Role } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

type Props = { nickname: string; role: Role };

// The signed-in user's entry point to their account (spec 015): a round
// initial in the header, at every screen size.
export default function AccountMenu({ nickname, role }: Props) {
  const t = useTranslations('auth');
  const [, startTransition] = useTransition();

  return (
    <DropdownMenu>
      {/* No asChild: Slot triggers hydrate badly (known-issues.md). */}
      <DropdownMenuTrigger
        aria-label={t('accountMenu')}
        className={cn(
          buttonVariants({ size: 'icon' }),
          'rounded-full font-semibold hover:bg-primary/90',
        )}
      >
        {nickname.charAt(0).toUpperCase() || '?'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">{nickname}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* The menu only renders on the client, after a click, so the
            Slot hydration issue doesn't apply to asChild items. */}
        <DropdownMenuItem asChild>
          <Link href="/profile">{t('profile')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/coaching">{t('myCoaching')}</Link>
        </DropdownMenuItem>
        {isStaff(role) && (
          <DropdownMenuItem asChild>
            <Link href="/admin">{t('admin')}</Link>
          </DropdownMenuItem>
        )}
        {role === 'admin' && (
          <DropdownMenuItem asChild>
            <Link href="/admin/coaches">{t('coaches')}</Link>
          </DropdownMenuItem>
        )}
        {role === 'user' && (
          <DropdownMenuItem asChild>
            <Link href="/become-coach">{t('becomeCoach')}</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => startTransition(() => signOut())}>
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
