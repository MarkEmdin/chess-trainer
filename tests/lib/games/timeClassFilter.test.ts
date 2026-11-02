import { filterByTimeClass } from '@/lib/games/timeClassFilter';
import type { Game, TimeClass } from '@/lib/games/types';

const game = (id: string, timeClass: TimeClass) =>
  ({ id, timeClass }) as Game;

const games = [
  game('b', 'bullet'),
  game('z', 'blitz'),
  game('r', 'rapid'),
  game('d', 'daily'),
];

describe('filterByTimeClass', () => {
  it('keeps only the selected time classes', () => {
    expect(filterByTimeClass(games, ['blitz', 'rapid']).map((g) => g.id)).toEqual(
      ['z', 'r'],
    );
  });

  it('never keeps daily games', () => {
    expect(
      filterByTimeClass(games, ['bullet', 'blitz', 'rapid']).map((g) => g.id),
    ).toEqual(['b', 'z', 'r']);
  });
});
