import { thinkAskTarget } from '@/app/components/LongThinks/format';
import type { LongThink } from '@/lib/games/longThinks';

it('turns a long think into the move to ask about', () => {
  const think: LongThink = {
    gameId: 'g',
    moveIndex: 6,
    fullMoveNumber: 3,
    san: 'Nf6',
    color: 'black',
    fenBefore: 'FEN',
    seconds: 50,
  };
  expect(thinkAskTarget(think)).toEqual({
    moveIndex: 6,
    fen: 'FEN',
    label: '3… Nf6',
  });
});
