import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-[#f5f0e8] font-sans">
      <div className="text-center max-w-xl px-6">
        <div className="text-6xl mb-6">♔</div>
        <h1 className="text-4xl font-bold text-stone-800 mb-4">
          Chess Fundamentals
        </h1>
        <p className="text-lg text-stone-600 mb-8">
          Master the basics — pieces, moves, and core strategies.
        </p>
        <Link
          href="/lessons"
          className="inline-block rounded-lg bg-stone-800 px-6 py-3 text-sm font-medium text-[#f5f0e8] hover:bg-stone-700 transition-colors"
        >
          Start Learning
        </Link>
      </div>
    </div>
  );
}
