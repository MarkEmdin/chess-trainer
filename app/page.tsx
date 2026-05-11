import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background font-sans">
      <div className="text-center max-w-xl px-6">
        <div className="text-6xl mb-6">♔</div>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Chess Fundamentals
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Master the basics — pieces, moves, and core strategies.
        </p>
        <Link
          href="/lessons"
          className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Start Learning
        </Link>
      </div>
    </div>
  );
}
