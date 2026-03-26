'use client';

import { useEffect, useState } from 'react';
import { chessPieces } from '../../constants/chessPieces';
import Image from 'next/image';

type PieceKey = keyof typeof chessPieces;
const pieceKeys = Object.keys(chessPieces) as PieceKey[];

export default function PieceValuesTraining() {
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
      <div className="flex gap-6">
        <div className="flex flex-wrap gap-4">
          {pieceKeys.map((key) => {
            const piece = chessPieces[key];
            return (
              <div
                key={key}
                onClick={() => addToAnswer(key)}
                className="flex flex-col items-center rounded-lg border border-stone-300 bg-white p-4 w-28 cursor-pointer hover:border-stone-400 transition-colors"
              >
                <Image
                  src={piece.image}
                  alt={piece.name}
                  width={80}
                  height={80}
                  loading="eager"
                />
                <span className="text-sm font-semibold text-stone-800">
                  {piece.name}
                </span>
                <span className="text-xs text-stone-500">
                  Points: {piece.points}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col items-center justify-center shrink-0">
          <span className="text-5xl font-bold text-stone-800">
            {targetValue}
          </span>
          <button
            onClick={reset}
            className="mt-3 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-[#f5f0e8] hover:bg-stone-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
      {answer.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-stone-300">
          {answer.map((value, i) => (
            <div
              key={i}
              onClick={() => removeFromAnswer(i)}
              className="flex flex-col items-center bg-white rounded-lg border border-stone-300 p-2 w-16 cursor-pointer hover:border-red-300 transition-colors"
            >
              <Image
                src={chessPieces[value].image}
                alt={value}
                width={40}
                height={40}
                loading="eager"
              />
              <span className="text-xs text-stone-600">
                {chessPieces[value].name}
              </span>
            </div>
          ))}
        </div>
      )}
      {answer.length > 0 && (
        <div className="flex items-center gap-4">
          <button
            onClick={checkAnswer}
            className="rounded-lg bg-stone-800 px-6 py-3 text-sm font-medium text-[#f5f0e8] hover:bg-stone-700 transition-colors"
          >
            Check Answer
          </button>
          {result !== null && (
            <span
              className={`text-lg font-semibold ${result ? 'text-green-600' : 'text-red-500'}`}
            >
              {result ? 'Correct!' : 'Wrong, try again'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
