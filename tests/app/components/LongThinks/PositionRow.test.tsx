import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import PositionRow from '@/app/components/LongThinks/PositionRow';
import type { LongThink } from '@/lib/games/longThinks';
import type { Game } from '@/lib/games/types';

// The real board renders dnd-kit screen-reader instructions; stand in for
// them so the row's accessible name can be checked.
jest.mock('react-chessboard', () => ({
  Chessboard: () => <div data-testid="board">To pick up a draggable item</div>,
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

function row(props: Partial<React.ComponentProps<typeof PositionRow>> = {}) {
  const onSelect = jest.fn();
  renderWithIntl(
    <PositionRow
      think={think}
      game={game}
      status="none"
      hasNewAnswer={false}
      selected={false}
      onSelect={onSelect}
      {...props}
    />,
  );
  return { onSelect };
}

describe('<PositionRow />', () => {
  it('shows the move and think time', () => {
    row();
    expect(screen.getByText('17. Nf5')).toBeInTheDocument();
    expect(screen.getByText('02:14')).toBeInTheDocument();
  });

  it('shows a waiting pill when asked', () => {
    row({ status: 'asked' });
    expect(screen.getByText('Question asked')).toBeInTheDocument();
  });

  it('shows an answered pill when answered', () => {
    row({ status: 'answered' });
    expect(screen.getByText('Answered')).toBeInTheDocument();
  });

  it('flags an unseen answer', () => {
    row({ status: 'answered', hasNewAnswer: true });
    expect(screen.getByText('New answer')).toBeInTheDocument();
  });

  it('shows the opponent when not asked', () => {
    row();
    expect(screen.getByText(/vs hikaru · Blitz/)).toBeInTheDocument();
  });

  it('reports selection', async () => {
    const { onSelect } = row({ selected: true });
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button);
    // One stable handler for every row (memoised rows, spec 017): the row
    // says which position it is.
    expect(onSelect).toHaveBeenCalledWith(think, game);
  });

  it('keeps the thumbnail out of the accessible name', () => {
    row();
    expect(screen.getByRole('button')).toHaveAccessibleName(
      expect.not.stringContaining('draggable'),
    );
    expect(screen.getByRole('button')).toHaveAccessibleName(
      expect.stringContaining('17. Nf5'),
    );
  });
});
