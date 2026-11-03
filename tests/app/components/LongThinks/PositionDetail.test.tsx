import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import PositionDetail from '@/app/components/LongThinks/PositionDetail';
import type { LongThink } from '@/lib/games/longThinks';
import type { Game } from '@/lib/games/types';

jest.mock('react-chessboard', () => ({
  Chessboard: () => <div data-testid="board" />,
}));

const think: LongThink = {
  gameId: 'g1',
  moveIndex: 33,
  fullMoveNumber: 17,
  san: 'Nf5',
  color: 'white',
  fenBefore: '8/8/8/8/8/8/8/K6k w - - 0 1',
  seconds: 134,
};

const game: Game = {
  id: 'g1',
  url: '',
  pgn: '',
  endTime: new Date('2026-10-12T12:00:00Z'),
  timeClass: 'blitz',
  timeControl: '180+2',
  increment: 2,
  userColor: 'white',
  user: { username: 'mark_e', rating: 1712 },
  opponent: { username: 'hikaru', rating: 1745 },
  result: 'loss',
  finalFen: '',
  clockSnapshots: [],
};

function detail(
  props: Partial<React.ComponentProps<typeof PositionDetail>> = {},
) {
  const handlers = { onAskCoach: jest.fn(), onOpenGame: jest.fn() };
  renderWithIntl(
    <PositionDetail
      think={think}
      game={game}
      isAuthenticated
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('<PositionDetail />', () => {
  it('shows how long the player thought and over which move', () => {
    detail();
    expect(screen.getByText('02:14')).toBeInTheDocument();
    expect(screen.getByText('17. Nf5')).toBeInTheDocument();
    expect(screen.getByText('hikaru')).toBeInTheDocument();
  });

  it('offers to ask the coach when signed in without a thread', async () => {
    const { onAskCoach } = detail();
    await userEvent.click(screen.getByRole('button', { name: /ask coach/i }));
    expect(onAskCoach).toHaveBeenCalled();
  });

  it('opens the question when a thread exists', async () => {
    const { onAskCoach } = detail({
      thread: { body: 'Was Nf5 ok?', responses: [{ body: 'Play Qd2' }] },
    });
    expect(screen.getByText('Play Qd2')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /ask coach/i }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /open question/i }),
    );
    expect(onAskCoach).toHaveBeenCalled();
  });

  it('names the coach who answered', () => {
    detail({
      thread: {
        body: 'Was Nf5 ok?',
        responses: [
          {
            body: 'Play Qd2',
            author: { first_name: 'Anna', last_name: 'Ivanova', title: 'IM' },
          },
        ],
      },
    });
    expect(screen.getByText('Answer from IM Anna Ivanova')).toBeInTheDocument();
  });

  it('shows a sign-in hint to guests', () => {
    detail({ isAuthenticated: false });
    expect(
      screen.queryByRole('button', { name: /ask coach|open question/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/sign in to ask a coach/i)).toBeInTheDocument();
  });

  it('always offers the whole game', async () => {
    const { onOpenGame } = detail({ isAuthenticated: false });
    await userEvent.click(
      screen.getByRole('button', { name: /open the whole game/i }),
    );
    expect(onOpenGame).toHaveBeenCalled();
  });

  it('shows back and counter on mobile', async () => {
    const onBack = jest.fn();
    detail({ onBack, counter: { n: 1, total: 24 } });
    expect(screen.getByText('1 / 24')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('has no back button without onBack', () => {
    detail();
    expect(
      screen.queryByRole('button', { name: /back/i }),
    ).not.toBeInTheDocument();
  });
});
