import { Chess } from 'chess.js';
import {
  buildReplay,
  formatMoveLabel,
  replayAroundKey,
} from '@/lib/chess/replay';

const START = new Chess().fen();
const FALLBACK = '8/8/8/8/8/8/8/K6k w - - 0 1';

describe('buildReplay', () => {
  it('replays a standard game', () => {
    const { positions, moves } = buildReplay('1. e4 e5 2. Nf3', FALLBACK);
    expect(positions).toHaveLength(4);
    expect(positions[0]).toBe(START);
    expect(moves[0]).toEqual({
      san: 'e4',
      color: 'white',
      fullMoveNumber: 1,
      from: 'e2',
      to: 'e4',
    });
    expect(moves[1]).toMatchObject({ color: 'black', fullMoveNumber: 1 });
    expect(moves[2]).toMatchObject({ san: 'Nf3', fullMoveNumber: 2 });
  });

  it('replays from a custom FEN header', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const pgn = `[SetUp "1"]\n[FEN "${fen}"]\n\n1. e4 Kd7 *`;
    const { positions, moves } = buildReplay(pgn, FALLBACK);
    expect(positions[0]).toBe(fen);
    expect(positions).toHaveLength(3);
    expect(moves.map((m) => m.san)).toEqual(['e4', 'Kd7']);
  });

  it('numbers a black-first game from the FEN', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 b - - 0 7';
    const pgn = `[SetUp "1"]\n[FEN "${fen}"]\n\n7... Kd7 8. e4 *`;
    const { moves } = buildReplay(pgn, FALLBACK);
    expect(moves[0]).toMatchObject({ color: 'black', fullMoveNumber: 7 });
    expect(formatMoveLabel(moves[0])).toBe('7… Kd7');
    expect(formatMoveLabel(moves[1])).toBe('8. e4');
  });

  it("falls back to the final FEN when the PGN can't be parsed", () => {
    const bad = '1. e4 e5 2. Zz9';
    expect(() => new Chess().loadPgn(bad)).toThrow();
    expect(buildReplay(bad, FALLBACK)).toEqual({
      positions: [FALLBACK],
      moves: [],
    });
  });

  it('handles an empty PGN', () => {
    const { positions, moves } = buildReplay('', FALLBACK);
    expect(positions).toHaveLength(1);
    expect(moves).toEqual([]);
  });

  it('keeps promotions in the after FEN', () => {
    const pgn =
      '[SetUp "1"]\n[FEN "8/P6k/8/8/8/8/8/K7 w - - 0 1"]\n\n1. a8=Q *';
    const { positions } = buildReplay(pgn, FALLBACK);
    expect(positions[positions.length - 1].startsWith('Q')).toBe(true);
  });
});

describe('replayAroundKey', () => {
  const PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6';
  // Position before half-move 5 (3. Bb5).
  const KEY_FEN = buildReplay(PGN, FALLBACK).positions[4];

  it('returns positions, moves and the key index', () => {
    const replay = replayAroundKey(PGN, KEY_FEN, 5);
    expect(replay?.keyIndex).toBe(4);
    expect(replay?.moves[4].san).toBe('Bb5');
    expect(replay?.positions[4]).toBe(KEY_FEN);
  });

  it('returns null when the fen does not match moveIndex', () => {
    expect(replayAroundKey(PGN, KEY_FEN, 3)).toBeNull();
  });

  it('returns null when moveIndex points past the last move', () => {
    const finalFen = buildReplay(PGN, FALLBACK).positions[6];
    expect(replayAroundKey(PGN, finalFen, 7)).toBeNull();
  });

  it('returns null for an unparsable pgn', () => {
    expect(replayAroundKey('garbage', START, 1)).toBeNull();
  });
});
