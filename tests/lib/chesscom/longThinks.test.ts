import { findLongThinks } from '@/lib/chesscom/longThinks';
import type { Game } from '@/lib/chesscom/types';

// Four half-moves, 3-minute time control, no increment unless overridden.
// Clock evolution (white spends 5s on move 1, black 10s, white 7s, black 5s):
const SAMPLE_PGN = `[Event "Test"]
[White "alice"]
[Black "bob"]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 1/2-1/2`;

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    url: '',
    pgn: SAMPLE_PGN,
    endTime: new Date('2025-01-01'),
    timeClass: 'blitz',
    timeControl: '180',
    increment: 0,
    userColor: 'white',
    user: { username: 'alice', rating: 1500 },
    opponent: { username: 'bob', rating: 1700 },
    result: 'draw',
    finalFen: '',
    clockSnapshots: [
      { whiteSeconds: 180, blackSeconds: 180 }, // start
      { whiteSeconds: 175, blackSeconds: 180 }, // white played e4 (5s)
      { whiteSeconds: 175, blackSeconds: 170 }, // black played e5 (10s)
      { whiteSeconds: 168, blackSeconds: 170 }, // white played Nf3 (7s)
      { whiteSeconds: 168, blackSeconds: 165 }, // black played Nc6 (5s)
    ],
    ...overrides,
  };
}

describe('findLongThinks', () => {
  it("returns the user's moves at or above the threshold", () => {
    const thinks = findLongThinks(makeGame({ userColor: 'white' }), 5);
    expect(thinks).toHaveLength(2);
    expect(thinks[0]).toMatchObject({
      moveIndex: 1,
      san: 'e4',
      color: 'white',
      seconds: 5,
    });
    expect(thinks[1]).toMatchObject({
      moveIndex: 3,
      san: 'Nf3',
      color: 'white',
      seconds: 7,
    });
  });

  it('filters strictly by threshold', () => {
    const game = makeGame({ userColor: 'white' });
    expect(findLongThinks(makeGame({ userColor: 'white' }), 10)).toHaveLength(
      0,
    );
    expect(findLongThinks(game, 6)).toHaveLength(1); // only the 7s think
  });

  it("filters to the user's color (ignores opponent thinks)", () => {
    const blackThinks = findLongThinks(makeGame({ userColor: 'black' }), 5);
    expect(blackThinks).toHaveLength(2);
    expect(blackThinks.every((t) => t.color === 'black')).toBe(true);
    expect(blackThinks[0]).toMatchObject({ san: 'e5', seconds: 10 });
    expect(blackThinks[1]).toMatchObject({ san: 'Nc6', seconds: 5 });
  });

  it('accounts for time-control increment so the auto-gain is not counted as thinking', () => {
    // With +2 increment, formula = (prev + 2) - curr.
    // White move 1: (180 + 2) - 175 = 7s; white move 2: (175 + 2) - 168 = 9s.
    const thinks = findLongThinks(makeGame({ increment: 2 }), 5);
    expect(thinks).toHaveLength(2);
    expect(thinks[0].seconds).toBe(7);
    expect(thinks[1].seconds).toBe(9);
  });

  it("leaves lastOpponentMove undefined for white's first move", () => {
    const thinks = findLongThinks(makeGame({ userColor: 'white' }), 5);
    expect(thinks[0].lastOpponentMove).toBeUndefined();
    expect(thinks[1].lastOpponentMove).toEqual({ from: 'e7', to: 'e5' });
  });

  it("populates lastOpponentMove for black's first move with white's move", () => {
    const thinks = findLongThinks(makeGame({ userColor: 'black' }), 5);
    expect(thinks[0].lastOpponentMove).toEqual({ from: 'e2', to: 'e4' });
  });

  it('returns an empty array for malformed PGN', () => {
    const game = makeGame({ pgn: '%%% not real pgn %%%' });
    expect(findLongThinks(game, 5)).toEqual([]);
  });

  it('returns an empty array when there are too few clock snapshots', () => {
    const game = makeGame({
      clockSnapshots: [{ whiteSeconds: 180, blackSeconds: 180 }],
    });
    expect(findLongThinks(game, 5)).toEqual([]);
  });
});
