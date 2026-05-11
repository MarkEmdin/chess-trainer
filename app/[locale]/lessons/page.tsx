import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/app/components/ui/card';

const lessons = [
  { slug: 'theory', key: 'theory' },
  { slug: 'piece-values', key: 'pieceValues' },
  { slug: 'world-champions', key: 'worldChampions' },
] as const;

export default async function LessonsPage() {
  const t = await getTranslations('lessons');
  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8">{t('title')}</h1>
        <div className="flex flex-col gap-4">
          {lessons.map((lesson) => (
            <Link key={lesson.slug} href={`/lessons/${lesson.slug}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent>
                  <CardTitle>{t(`${lesson.key}.title`)}</CardTitle>
                  <CardDescription className="mt-1">
                    {t(`${lesson.key}.description`)}
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
