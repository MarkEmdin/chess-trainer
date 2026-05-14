import { getTranslations } from 'next-intl/server';
import { chessPieces } from '@/app/constants/chessPieces';
import PieceValuesTraining from '@/app/components/PieceValuesTraining';

type PieceKey = keyof typeof chessPieces;
const pieceKeys = Object.keys(chessPieces) as PieceKey[];

export default async function PieceValuesPage() {
  const t = await getTranslations('pieceValues');
  const tPieces = await getTranslations('pieces');

  const valuesList = pieceKeys
    .map((key) => `${tPieces(key)} = ${chessPieces[key].points}`)
    .join(' · ');

  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('title')}
        </h1>
        <p className="text-muted-foreground mb-1">{t('howTo')}</p>
        <p className="text-sm text-muted-foreground mb-8">{valuesList}</p>
        <PieceValuesTraining />
      </div>
    </div>
  );
}
