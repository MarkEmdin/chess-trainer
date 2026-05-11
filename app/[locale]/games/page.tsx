import { getTranslations } from 'next-intl/server';
import ChessComGames from '@/app/components/ChessComGames';

export default async function GamesPage() {
  const t = await getTranslations('games');
  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-muted-foreground mb-8">{t('subtitle')}</p>
        <ChessComGames />
      </div>
    </div>
  );
}
