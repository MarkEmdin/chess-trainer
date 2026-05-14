import { render } from '@testing-library/react';
import GameMatchup from '@/app/components/GameMatchup';
import type { Game } from '@/lib/chesscom/types';

const baseGame: Game = {
  id: 'g1',
  url: '',
  pgn: '',
  endTime: new Date('2025-01-01'),
  timeClass: 'blitz',
  timeControl: '180',
  increment: 0,
  userColor: 'white',
  user: { username: 'alice', rating: 1500 },
  opponent: { username: 'bob', rating: 1700 },
  result: 'draw',
  finalFen: '',
  clockSnapshots: [],
};

describe('<GameMatchup />', () => {
  it('puts the user on the left when they played white', () => {
    const { container } = render(
      <GameMatchup game={{ ...baseGame, userColor: 'white' }} />,
    );
    const text = container.textContent ?? '';
    expect(text.indexOf('alice')).toBeLessThan(text.indexOf('bob'));
  });

  it('puts the user on the right when they played black', () => {
    const { container } = render(
      <GameMatchup game={{ ...baseGame, userColor: 'black' }} />,
    );
    const text = container.textContent ?? '';
    expect(text.indexOf('bob')).toBeLessThan(text.indexOf('alice'));
  });

  it('emphasises the user with <strong> regardless of which side they played', () => {
    const whiteUser = render(
      <GameMatchup game={{ ...baseGame, userColor: 'white' }} />,
    );
    expect(whiteUser.container.querySelector('strong')?.textContent).toBe(
      'alice',
    );

    const blackUser = render(
      <GameMatchup game={{ ...baseGame, userColor: 'black' }} />,
    );
    expect(blackUser.container.querySelector('strong')?.textContent).toBe(
      'alice',
    );
  });

  it('renders both ratings', () => {
    const { container } = render(<GameMatchup game={baseGame} />);
    const text = container.textContent ?? '';
    expect(text).toContain('1500');
    expect(text).toContain('1700');
  });
});
