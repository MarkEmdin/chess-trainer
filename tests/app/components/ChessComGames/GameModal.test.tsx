import { fireEvent, renderWithIntl, screen } from '@/tests/test-utils';
import { Chess } from 'chess.js';
import GameModal from '@/app/components/ChessComGames/GameModal';
import type { Game } from '@/lib/games/types';

// react-chessboard is heavy and canvas-free rendering isn't what we test —
// the stub exposes exactly the props the modal controls.
jest.mock('@/app/components/ChessboardWithNotation', () => ({
  __esModule: true,
  default: ({
    position,
    squareStyles,
  }: {
    position: string;
    squareStyles?: Record<string, unknown>;
  }) => (
    <div
      data-testid="board"
      data-position={position}
      data-highlight={JSON.stringify(Object.keys(squareStyles ?? {}).sort())}
    />
  ),
}));

const makeGame = (overrides: Partial<Game> = {}): Game => ({
  id: 'g1',
  url: 'https://lichess.org/g1',
  pgn: '1. e4 e5 2. Nf3',
  endTime: new Date('2026-10-01T12:00:00Z'),
  timeClass: 'blitz',
  timeControl: '180',
  increment: 0,
  userColor: 'white',
  user: { username: 'alice', rating: 1500 },
  opponent: { username: 'bob', rating: 1600 },
  result: 'win',
  finalFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
  clockSnapshots: [
    { whiteSeconds: 180, blackSeconds: 180 },
    { whiteSeconds: 170, blackSeconds: 180 },
    { whiteSeconds: 170, blackSeconds: 175 },
    { whiteSeconds: 160, blackSeconds: 175 },
  ],
  ...overrides,
});

// Names also appear in the sr-only matchup description, so pick the match
// that lives inside a player row.
const rowOf = (name: string) =>
  screen
    .getAllByText(name)
    .map((el) => el.closest('[data-slot="player-row"]'))
    .find(Boolean) as HTMLElement;
const board = () => screen.getByTestId('board');
const press = (key: string) => fireEvent.keyDown(document, { key });

describe('<GameModal />', () => {
  it("labels each player's color", () => {
    renderWithIntl(<GameModal game={makeGame()} onClose={() => {}} />);
    expect(rowOf('alice')).toHaveTextContent('White');
    expect(rowOf('bob')).toHaveTextContent('Black');
  });

  it('shows To move on the side to move and flips when stepping', () => {
    renderWithIntl(<GameModal game={makeGame()} onClose={() => {}} />);
    expect(screen.getAllByText(/to move/i)).toHaveLength(1);
    expect(rowOf('alice')).toHaveTextContent(/to move/i);

    press('ArrowRight');

    expect(screen.getAllByText(/to move/i)).toHaveLength(1);
    expect(rowOf('bob')).toHaveTextContent(/to move/i);
  });

  it('highlights the last move squares', () => {
    renderWithIntl(<GameModal game={makeGame()} onClose={() => {}} />);
    expect(board()).toHaveAttribute('data-highlight', '[]');
    press('ArrowRight');
    expect(board()).toHaveAttribute('data-highlight', '["e2","e4"]');
  });

  it('prevents default for navigation keys', () => {
    renderWithIntl(<GameModal game={makeGame()} onClose={() => {}} />);
    for (const key of ['End', 'Home', 'ArrowRight', 'ArrowLeft']) {
      expect(press(key)).toBe(false);
    }
  });

  it('attributes duration to black in a black-first game', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 b - - 0 1';
    renderWithIntl(
      <GameModal
        game={makeGame({
          pgn: `[SetUp "1"]\n[FEN "${fen}"]\n\n1... Kd7 *`,
          clockSnapshots: [
            { whiteSeconds: 60, blackSeconds: 60 },
            { whiteSeconds: 60, blackSeconds: 50 },
          ],
        })}
        onClose={() => {}}
      />,
    );
    press('ArrowRight');
    expect(screen.getByText(/1… Kd7 — 00:10/)).toBeInTheDocument();
  });

  it('does not crash on an unparseable PGN and disables navigation', () => {
    const pgn = '1. e4 e5 2. Zz9';
    expect(() => new Chess().loadPgn(pgn)).toThrow();
    const game = makeGame({ pgn });
    renderWithIntl(<GameModal game={game} onClose={() => {}} />);
    expect(board()).toHaveAttribute('data-position', game.finalFen);
    expect(screen.getByRole('button', { name: /next move/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /go to end/i })).toBeDisabled();
  });

  it('clamps initialIndex past the end', () => {
    const parser = new Chess();
    parser.loadPgn('1. e4 e5 2. Nf3');
    renderWithIntl(
      <GameModal game={makeGame()} onClose={() => {}} initialIndex={99} />,
    );
    expect(board()).toHaveAttribute('data-position', parser.fen());
    expect(screen.getByText('Move 3 / 3')).toBeInTheDocument();
  });
});
