import { buildReplay } from '@/lib/chess/replay';
import { findAskTarget } from '@/lib/coaching/askTarget';

const { positions, moves } = buildReplay('1. e4 e5 2. Nf3 Nc6', '');

describe('findAskTarget', () => {
  it('asks about the move played from the shown position', () => {
    expect(findAskTarget(positions, moves, 0, 'white')).toEqual({
      moveIndex: 1,
      fen: positions[0],
      label: '1. e4',
    });
  });

  it('asks about the move just played when the opponent is to move', () => {
    expect(findAskTarget(positions, moves, 1, 'white')?.moveIndex).toBe(1);
  });

  it('follows the board to the next own move', () => {
    expect(findAskTarget(positions, moves, 2, 'white')).toMatchObject({
      moveIndex: 3,
      fen: positions[2],
      label: '2. Nf3',
    });
  });

  it('has nothing to ask before black has moved', () => {
    expect(findAskTarget(positions, moves, 0, 'black')).toBeNull();
  });

  it("labels black's moves with an ellipsis", () => {
    expect(findAskTarget(positions, moves, 1, 'black')).toMatchObject({
      moveIndex: 2,
      label: '1… e5',
    });
  });

  it('falls back to the last own move at the final position', () => {
    expect(findAskTarget(positions, moves, 4, 'white')?.moveIndex).toBe(3);
  });
});
