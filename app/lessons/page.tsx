import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/app/components/ui/card';

const lessons = [
  {
    slug: 'theory',
    title: 'Theory',
    description: 'Basic checkmates: two rooks, queen, rook.',
    icon: '/pieces/queen.svg',
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
            <Link key={lesson.slug} href={`/lessons/${lesson.slug}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-4">
                  {lesson.icon && (
                    <Image
                      src={lesson.icon}
                      alt=""
                      width={40}
                      height={40}
                      className="shrink-0"
                    />
                  )}
                  <div className="flex flex-col gap-1">
                    <CardTitle>{lesson.title}</CardTitle>
                    <CardDescription>{lesson.description}</CardDescription>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
