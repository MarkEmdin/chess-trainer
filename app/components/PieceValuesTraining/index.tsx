'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { chessPieces } from '../../constants/chessPieces';
import { Button } from '@/app/components/ui/button';

type PieceKey = keyof typeof chessPieces;
const pieceKeys = Object.keys(chessPieces) as PieceKey[];

export default function PieceValuesTraining() {
  const t = useTranslations('pieceValues');
  const tPieces = useTranslations('pieces');
  const randomValue = () => Math.floor(Math.random() * 40) + 1;
  const [targetValue, setTargetValue] = useState<number>(0);

  useEffect(() => {
    setTargetValue(randomValue()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  const [answer, setAnswer] = useState<PieceKey[]>([]);
  const addToAnswer = (value: PieceKey) => {
    setAnswer((prev) => [...prev, value]);
  };
  const removeFromAnswer = (index: number) => {
    setAnswer((prev) => prev.toSpliced(index, 1));
  };

  const [result, setResult] = useState<boolean | null>(null);

  const checkAnswer = () => {
    const sum = answer.reduce((acc, key) => acc + chessPieces[key].points, 0);
    setResult(sum === targetValue);
  };

  const reset = () => {
    setTargetValue(randomValue());
    setAnswer([]);
    setResult(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Pieces picker */}
      <div className="flex flex-wrap gap-3">
        {pieceKeys.map((key) => {
          const piece = chessPieces[key];
          const name = tPieces(key);
          return (
            <div
              key={key}
              onClick={() => addToAnswer(key)}
              className="flex flex-col items-center rounded-lg border border-border bg-card p-2 w-20 cursor-pointer hover:border-foreground/40 transition-colors"
            >
              <Image
                src={piece.image}
                alt={name}
                width={56}
                height={56}
                loading="eager"
              />
              <span className="text-xs font-medium text-foreground mt-1">
                {name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action panel — sticks to the bottom of the viewport on mobile so
          the target and check button stay reachable while scrolling pieces.
          On sm+ it just falls back to normal flow at the end of the column. */}
      <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-background border-t border-border sm:static sm:mx-0 sm:p-0 sm:border-0 sm:bg-transparent">
        <div className="flex items-center gap-4">
          <span className="text-5xl font-bold text-foreground">
            {targetValue}
          </span>
          <Button onClick={reset}>{t('reset')}</Button>
        </div>

        {answer.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            {answer.map((value, i) => (
              <div
                key={i}
                onClick={() => removeFromAnswer(i)}
                className="flex flex-col items-center bg-card rounded-lg border border-border p-2 w-16 cursor-pointer hover:border-destructive/50 transition-colors"
              >
                <Image
                  src={chessPieces[value].image}
                  alt={tPieces(value)}
                  width={40}
                  height={40}
                  loading="eager"
                />
                <span className="text-xs text-muted-foreground">
                  {tPieces(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {answer.length > 0 && (
          <div className="flex items-center gap-4 mt-4">
            <Button onClick={checkAnswer} size="lg">
              {t('checkAnswer')}
            </Button>
            {result !== null && (
              <span
                className={`text-lg font-semibold ${result ? 'text-green-600' : 'text-destructive'}`}
              >
                {result ? t('correct') : t('wrong')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
