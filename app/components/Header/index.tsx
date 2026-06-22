import { Link } from '@/i18n/navigation';
import MobileNav from '@/app/components/MobileNav';
import AuthMenu from '@/app/components/AuthMenu';

const navLinks = [
  { href: '/lessons/world-champions', key: 'worldChampions' },
  { href: '/lessons/theory', key: 'theory' },
  { href: '/lessons/piece-values', key: 'pieceValues' },
  { href: '/games', key: 'games' },
  { href: '/think-time', key: 'thinkTime' },
] as const;

// One drawer-style nav at every breakpoint — a fixed-width desktop row
// keeps breaking as authenticated-only links (coaching, admin) get added,
// since how many items fit depends on who's logged in, not viewport size.
export default function Header() {
  return (
    <header className="bg-card text-card-foreground border-b border-border">
      <nav className="max-w-5xl mx-auto flex items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="text-lg font-bold hover:text-muted-foreground transition-colors"
        >
          ♔ Chess Fundamentals
        </Link>

        <MobileNav navLinks={navLinks} authMenu={<AuthMenu />} />
      </nav>
    </header>
  );
}
