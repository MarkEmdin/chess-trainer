import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import LanguageToggle from '@/app/components/LanguageToggle';
import ThemeToggle from '@/app/components/ThemeToggle';

const navLinks = [
  { href: '/lessons/world-champions', key: 'worldChampions' },
  { href: '/lessons/theory', key: 'theory' },
  { href: '/lessons/piece-values', key: 'pieceValues' },
] as const;

export default async function Header() {
  const t = await getTranslations('nav');
  return (
    <header className="bg-card text-card-foreground border-b border-border">
      <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-bold hover:text-muted-foreground transition-colors"
        >
          ♔ Chess Fundamentals
        </Link>
        <div className="flex items-center gap-6">
          <ul className="flex gap-6">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm hover:text-muted-foreground transition-colors"
                >
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
