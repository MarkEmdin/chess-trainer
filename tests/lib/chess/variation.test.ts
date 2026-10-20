import { Chess } from 'chess.js';
import {
  MAX_VARIATION_MOVES,
  formatVariation,
  parseVariationField,
  playVariation,
} from '@/lib/chess/variation';

const START = new Chess().fen();
const BLACK_TO_MOVE =
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 3 3';

describe('playVariation', () => {
  it('plays a legal line', () => {
    const result = playVariation(START, ['e4', 'e5', 'Nf3']);
    expect(result?.positions).toHaveLength(4);
    expect(result?.positions[0]).toBe(START);
    expect(result?.moves[2]).toEqual({
      san: 'Nf3',
      color: 'white',
      fullMoveNumber: 2,
      from: 'g1',
      to: 'f3',
    });
  });

  it('returns null on an illegal move', () => {
    expect(playVariation(START, ['e4', 'e4'])).toBeNull();
  });

  it('returns null for an invalid FEN', () => {
    expect(playVariation('not a fen', ['e4'])).toBeNull();
  });

  it('handles an empty line', () => {
    expect(playVariation(START, [])).toEqual({ positions: [START], moves: [] });
  });
});

describe('formatVariation', () => {
  it('formats a black-first line', () => {
    const result = playVariation(BLACK_TO_MOVE, ['Nf6', 'Nc3', 'Bc5']);
    expect(formatVariation(result!.moves)).toBe('3… Nf6 4. Nc3 Bc5');
  });

  it('formats a white-first line', () => {
    const result = playVariation(START, ['e4', 'e5']);
    expect(formatVariation(result!.moves)).toBe('1. e4 e5');
  });
});

describe('parseVariationField', () => {
  it('treats a missing or empty field as no variation', () => {
    expect(parseVariationField(null)).toBeNull();
    expect(parseVariationField('')).toBeNull();
  });

  it('parses a JSON array of SAN strings', () => {
    expect(parseVariationField('["e4"]')).toEqual(['e4']);
  });

  it.each([
    'nope',
    '{}',
    '[1]',
    '[]',
    JSON.stringify(Array(MAX_VARIATION_MOVES + 1).fill('e4')),
  ])('rejects %s', (raw) => {
    expect(parseVariationField(raw)).toBe('invalid');
  });
});
