import Image from 'next/image';
import Link from 'next/link';

const lessons = [
  {
    slug: 'queen-checkmate',
    title: 'Queen Checkmate',
    description:
      'Learn how to deliver checkmate with a king and queen vs. a lone king.',
  },
  {
    slug: 'piece-values',
    title: 'Piece Values',
    description:
      'Understand the relative value of each chess piece and why it matters.',
  },
  {
    slug: 'world-champions',
    title: 'World Champions USSR history',
    description: 'World Champions USSR history.',
    icon: '/pieces/king.svg',
  },
];

export default function LessonsPage() {
  return (
    <div className="flex flex-col flex-1 bg-[#f5f0e8] font-sans px-6 py-12">
      <div className="max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-stone-800 mb-8">Lessons</h1>
        <div className="flex flex-col gap-4">
          {lessons.map((lesson) => (
            <Link
              key={lesson.slug}
              href={`/lessons/${lesson.slug}`}
              className="flex items-start gap-4 rounded-lg border border-stone-300 bg-white p-5 hover:border-stone-400 hover:shadow-sm transition-all"
            >
              {lesson.icon && (
                <Image
                  src={lesson.icon}
                  alt=""
                  width={40}
                  height={40}
                  className="shrink-0"
                />
              )}
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-stone-800">
                  {lesson.title}
                </h2>
                <p className="text-sm text-stone-500 mt-1">
                  {lesson.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
