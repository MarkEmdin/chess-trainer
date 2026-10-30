import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import MobileNav from '@/app/components/MobileNav';
import AccountMenu from '@/app/components/AccountMenu';
import NotificationBell from '@/app/components/NotificationBell';
import { getAuthedUser } from '@/lib/auth/getUser';

const navLinks = [
  { href: '/lessons/world-champions', key: 'worldChampions' },
  { href: '/lessons/theory', key: 'theory' },
  { href: '/lessons/piece-values', key: 'pieceValues' },
  { href: '/games', key: 'games' },
  { href: '/think-time', key: 'thinkTime' },
] as const;

const linkClass = 'text-sm hover:text-muted-foreground transition-colors';

// One drawer-style nav at every breakpoint — a fixed-width desktop row
// keeps breaking as authenticated-only links (coaching, admin) get added,
// since how many items fit depends on who's logged in, not viewport size.
// Account links sit outside the drawer, in AccountMenu (spec 015).
export default async function Header() {
  const [user, t] = await Promise.all([
    getAuthedUser(),
    getTranslations('auth'),
  ]);

  return (
    <header className="bg-card text-card-foreground border-b border-border">
      <nav className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold hover:text-muted-foreground transition-colors"
        >
          ♔ Chess Fundamentals
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <NotificationBell />
          {user ? (
            <AccountMenu
              nickname={user.nickname}
              isAdmin={user.role === 'admin'}
            />
          ) : (
            <Link href="/login" className={linkClass}>
              {t('signIn')}
            </Link>
          )}
          <MobileNav
            navLinks={navLinks}
            authMenu={
              user ? null : (
                <div className="flex items-center gap-4">
                  <Link href="/login" className={linkClass}>
                    {t('signIn')}
                  </Link>
                  <Link href="/register" className={linkClass}>
                    {t('signUp')}
                  </Link>
                </div>
              )
            }
          />
        </div>
      </nav>
    </header>
  );
}
