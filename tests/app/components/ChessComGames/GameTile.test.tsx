import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import GameTile from '@/app/components/ChessComGames/GameTile';
import type { Game, GameResult } from '@/lib/chesscom/types';

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    url: '',
    pgn: '',
    endTime: new Date('2026-05-11T12:00:00Z'),
    timeClass: 'blitz',
    timeControl: '180',
    increment: 0,
    userColor: 'white',
    user: { username: 'alice', rating: 1500 },
    opponent: { username: 'bob', rating: 1700 },
    result: 'win',
    finalFen: '',
    clockSnapshots: [],
    ...overrides,
  };
}

describe('<GameTile />', () => {
  it('renders the result badge text', () => {
    renderWithIntl(
      <GameTile game={makeGame({ result: 'win' })} onClick={() => {}} />,
    );
    expect(screen.getByText(/^win$/i)).toBeInTheDocument();
  });

  it('renders the time-class label', () => {
    renderWithIntl(
      <GameTile
        game={makeGame({ timeClass: 'rapid' })}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText(/^rapid$/i)).toBeInTheDocument();
  });

  it('renders the matchup with both usernames and ratings', () => {
    renderWithIntl(<GameTile game={makeGame()} onClick={() => {}} />);
    const tile = screen.getByRole('button');
    expect(tile).toHaveTextContent('alice');
    expect(tile).toHaveTextContent('bob');
    expect(tile).toHaveTextContent('1500');
    expect(tile).toHaveTextContent('1700');
  });

  it('renders a formatted end date', () => {
    renderWithIntl(<GameTile game={makeGame()} onClick={() => {}} />);
    // useFormatter with dateStyle: 'medium' in en formats to "May 11, 2026".
    expect(screen.getByText(/may 11, 2026/i)).toBeInTheDocument();
  });

  it.each<GameResult>(['win', 'loss', 'draw'])(
    'renders the localized result text for %s',
    (result) => {
      renderWithIntl(
        <GameTile game={makeGame({ result })} onClick={() => {}} />,
      );
      // Per messages/en.json: Win / Loss / Draw.
      const label = result === 'win' ? 'Win' : result === 'loss' ? 'Loss' : 'Draw';
      expect(screen.getByText(label)).toBeInTheDocument();
    },
  );

  it('calls onClick when the tile is clicked', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    renderWithIntl(<GameTile game={makeGame()} onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
