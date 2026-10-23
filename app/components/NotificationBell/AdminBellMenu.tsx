'use client';

import { useTranslations } from 'next-intl';
import { BellIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { buttonVariants } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import BadgePill from './BadgePill';

type Props = {
  unseenAnswers: number;
  newQuestions: number;
  label: string;
};

// The admin's bell opens a menu: their students' new questions, or the
// answers to questions they asked themselves.
export default function AdminBellMenu({
  unseenAnswers,
  newQuestions,
  label,
}: Props) {
  const t = useTranslations('notifications');
  return (
    <DropdownMenu>
      {/* No asChild: Slot triggers hydrate badly (known-issues.md). */}
      <DropdownMenuTrigger
        aria-label={label}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'relative',
        )}
      >
        <BellIcon aria-hidden />
        <BadgePill count={newQuestions} tone="green" />
        <BadgePill count={unseenAnswers} tone="red" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* The menu only renders on the client, after a click, so the
            Slot hydration issue doesn't apply to asChild items. */}
        <DropdownMenuItem asChild>
          <Link href="/admin" className="flex justify-between">
            {t('newQuestions')}
            <BadgePill count={newQuestions} tone="green" inline />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/coaching?tab=answered" className="flex justify-between">
            {t('myAnswers')}
            <BadgePill count={unseenAnswers} tone="red" inline />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
