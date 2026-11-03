import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import SiteNav from '@/app/components/SiteNav';
import LanguageToggle from '@/app/components/LanguageToggle';
import AccountMenu from '@/app/components/AccountMenu';
import NotificationBell from '@/app/components/NotificationBell';
import { getAuthedUser } from '@/lib/auth/getUser';
import { cn } from '@/lib/utils';

const linkClass =
  'text-sm text-muted-foreground hover:text-foreground transition-colors';

// Three section links sit inline (a bottom tab bar on mobile, see SiteNav).
// Account-only links (coaching, admin) live in AccountMenu since spec 015,
// so the row no longer grows with who is logged in.
export default async function Header() {
  const [user, t] = await Promise.all([
    getAuthedUser(),
    getTranslations('auth'),
  ]);

  return (
    <header className="bg-card text-card-foreground border-b border-border">
      <nav className="max-w-6xl mx-auto flex items-center gap-6 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-base font-bold whitespace-nowrap hover:text-muted-foreground transition-colors"
        >
          ♔ Chess Fundamentals
        </Link>

        <SiteNav />

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <NotificationBell />
          <LanguageToggle />
          {user ? (
            <AccountMenu nickname={user.nickname} role={user.role} />
          ) : (
            <>
              <Link href="/login" className={linkClass}>
                {t('signIn')}
              </Link>
              <Link
                href="/register"
                className={cn(linkClass, 'hidden sm:inline')}
              >
                {t('signUp')}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
