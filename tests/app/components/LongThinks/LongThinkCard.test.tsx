import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import LongThinkCard from '@/app/components/LongThinks/LongThinkCard';
import type { LongThink } from '@/lib/chesscom/longThinks';
import type { Game } from '@/lib/chesscom/types';

// react-chessboard pulls in DnD libraries that don't behave well in JSDOM
// and the card's logic is unrelated to how the board renders — replace it
// with a stub that just confirms the position it was handed.
jest.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: { position?: string } }) => (
    <div data-testid="chessboard" data-position={options?.position ?? ''} />
  ),
}));

const baseGame: Game = {
  id: 'g1',
  url: 'https://chess.com/game/1',
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
};

const whiteThink: LongThink = {
  gameId: 'g1',
  moveIndex: 5,
  fullMoveNumber: 3,
  san: 'Nf3',
  color: 'white',
  fenBefore: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3',
  seconds: 47,
  lastOpponentMove: { from: 'b8', to: 'c6' },
};

describe('<LongThinkCard />', () => {
  it("formats a white move as '3. Nf3'", () => {
    renderWithIntl(
      <LongThinkCard think={whiteThink} game={baseGame} onClick={() => {}} />,
    );
    expect(screen.getByText('3. Nf3')).toBeInTheDocument();
  });

  it("formats a black move as '3… Nf6'", () => {
    const blackThink: LongThink = { ...whiteThink, color: 'black', san: 'Nf6' };
    renderWithIntl(
      <LongThinkCard
        think={blackThink}
        game={{ ...baseGame, userColor: 'black' }}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('3… Nf6')).toBeInTheDocument();
  });

  it('renders the thinking time using the formatSeconds output', () => {
    renderWithIntl(
      <LongThinkCard think={whiteThink} game={baseGame} onClick={() => {}} />,
    );
    // formatSeconds(47) === "00:47", message template "Thought {duration}".
    expect(screen.getByText(/Thought 00:47/i)).toBeInTheDocument();
  });

  it('renders the matchup with the user emphasised', () => {
    renderWithIntl(
      <LongThinkCard think={whiteThink} game={baseGame} onClick={() => {}} />,
    );
    const card = screen.getByRole('button');
    expect(card).toHaveTextContent('alice');
    expect(card).toHaveTextContent('bob');
    expect(card.querySelector('strong')?.textContent).toBe('alice');
  });

  it('hands the fenBefore position to the chessboard', () => {
    renderWithIntl(
      <LongThinkCard think={whiteThink} game={baseGame} onClick={() => {}} />,
    );
    expect(screen.getByTestId('chessboard')).toHaveAttribute(
      'data-position',
      whiteThink.fenBefore,
    );
  });

  it('calls onClick when the card is clicked', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <LongThinkCard think={whiteThink} game={baseGame} onClick={onClick} />,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
