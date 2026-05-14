import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/app/components/ui/card';

const items = [
  { href: '/lessons/theory', key: 'theory' },
  { href: '/lessons/piece-values', key: 'pieceValues' },
  { href: '/lessons/world-champions', key: 'worldChampions' },
  { href: '/games', key: 'games' },
  { href: '/think-time', key: 'thinkTime' },
] as const;

export default async function LessonsPage() {
  const t = await getTranslations('lessons');
  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8">{t('title')}</h1>
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent>
                  <CardTitle>{t(`${item.key}.title`)}</CardTitle>
                  <CardDescription className="mt-1">
                    {t(`${item.key}.description`)}
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
