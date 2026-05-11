import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

const navLinks = [
  { href: "/lessons/world-champions", label: "World Champions" },
  { href: "/lessons/theory", label: "Theory" },
  { href: "/lessons/piece-values", label: "Piece Values" },
];

export default function Header() {
  return (
    <header className="bg-card text-card-foreground border-b border-border">
      <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold hover:text-muted-foreground transition-colors">
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
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
