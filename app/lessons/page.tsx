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
  },
];

export default function LessonsPage() {
  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8">Lessons</h1>
        <div className="flex flex-col gap-4">
          {lessons.map((lesson) => (
            <Link key={lesson.slug} href={`/lessons/${lesson.slug}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent>
                  <CardTitle>{lesson.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {lesson.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
