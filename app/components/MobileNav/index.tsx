'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MenuIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/app/components/ui/button';
import LanguageToggle from '@/app/components/LanguageToggle';
import ThemeToggle from '@/app/components/ThemeToggle';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/app/components/ui/sheet';

type NavLink = {
  href: string;
  key: string;
};

type Props = {
  navLinks: ReadonlyArray<NavLink>;
};

export default function MobileNav({ navLinks }: Props) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('nav');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={t('openMenu')}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'md:hidden',
        )}
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>♔ Chess Fundamentals</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 px-4">
          <ul className="flex flex-col">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-2 text-base hover:text-muted-foreground transition-colors"
                >
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 pt-4 mt-2 border-t border-border">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
