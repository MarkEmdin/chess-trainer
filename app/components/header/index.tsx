import Link from "next/link";

const navLinks = [
  { href: "/lessons/world-champions", label: "World Champions" },
  { href: "/lessons/queen-checkmate", label: "Basic Checkmates" },
  { href: "/lessons/piece-values", label: "Piece Values" },
];

export default function Header() {
  return (
    <header className="bg-stone-800 text-[#f5f0e8]">
      <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold hover:text-stone-300 transition-colors">
          ♔ Chess Fundamentals
        </Link>
        <ul className="flex gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm hover:text-stone-300 transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
