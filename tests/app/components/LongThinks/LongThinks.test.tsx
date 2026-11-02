import { act, fireEvent, renderWithIntl, screen } from '@/tests/test-utils';
import LongThinks from '@/app/components/LongThinks';

const FEN_A = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3';
const FEN_B = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

// Both modals load through next/dynamic, so one stub stands in for each;
// it exposes the game modal's "Ask coach" handler when it gets one.
jest.mock(
  'next/dynamic',
  () => () =>
    function ModalStub({ onAskCoach }: { onAskCoach?: () => void }) {
      return (
        <div data-testid="modal">
          {onAskCoach && <button onClick={onAskCoach}>modal ask</button>}
        </div>
      );
    },
);

jest.mock('@/app/components/GamesShell', () => ({
  __esModule: true,
  default: ({
    children,
  }: {
    children: (v: {
      games: unknown[];
      loadMore: React.ReactNode;
      timeFilter: React.ReactNode;
    }) => React.ReactNode;
  }) => (
    <>
      {children({
        games: [],
        loadMore: <button>load more</button>,
        timeFilter: <div>time chips</div>,
      })}
    </>
  ),
}));

const item = (gameId: string, fen: string) => ({
  think: {
    gameId,
    moveIndex: 5,
    fullMoveNumber: 3,
    san: 'Nf3',
    color: 'white',
    fenBefore: fen,
    seconds: 47,
  },
  game: {
    id: gameId,
    url: 'u',
    pgn: '',
    userColor: 'white',
    endTime: new Date(),
  },
});

let thinks = [item('g1', FEN_A), item('g2', FEN_B)];
jest.mock('@/lib/games/longThinks', () => ({
  collectLongThinks: () => thinks,
}));

jest.mock('@/lib/chesscom/useStoredThreshold', () => ({
  useStoredThreshold: () => [30, () => {}],
}));

jest.mock('@/app/components/LongThinks/PositionRow', () => ({
  __esModule: true,
  default: (props: {
    think: unknown;
    game: { id: string };
    selected: boolean;
    hasNewAnswer: boolean;
    onSelect: (think: unknown, game: unknown) => void;
  }) => (
    <button
      aria-pressed={props.selected}
      data-new={String(props.hasNewAnswer)}
      onClick={() => props.onSelect(props.think, props.game)}
    >
      row {props.game.id}
    </button>
  ),
}));

jest.mock('@/app/components/LongThinks/PositionDetail', () => ({
  __esModule: true,
  default: (props: {
    game: { id: string };
    onAskCoach: () => void;
    onOpenGame: () => void;
    onBack?: () => void;
  }) => (
    <div data-testid="detail">
      detail {props.game.id}
      <button onClick={props.onAskCoach}>ask</button>
      <button onClick={props.onOpenGame}>game</button>
      <button onClick={props.onBack}>back</button>
    </div>
  ),
}));

let requests: Record<string, Record<string, unknown>> = {};
const mutate = jest.fn();
jest.mock('@/lib/coaching/useMyCoachingRequests', () => ({
  useMyCoachingRequests: () => ({ data: requests, mutate }),
}));

const markResponseSeen = jest.fn();
jest.mock('@/lib/coaching/actions', () => ({
  markResponseSeen: (id: string) => markResponseSeen(id),
}));

const answered = { id: 'r1', fen: FEN_A, responses: [{ body: 'ok' }] };

const renderIt = () =>
  renderWithIntl(
    <LongThinks
      isAuthenticated
      initialChesscomUsername={null}
      initialLichessUsername={null}
    />,
  );

const detailText = () => screen.getByTestId('detail').textContent;

beforeEach(() => {
  thinks = [item('g1', FEN_A), item('g2', FEN_B)];
  requests = {};
  markResponseSeen.mockReset();
  markResponseSeen.mockResolvedValue(undefined);
  mutate.mockClear();
});

describe('<LongThinks /> selection', () => {
  it('shows the time-control chips in the list column', () => {
    renderIt();
    expect(screen.getByText('time chips')).toBeInTheDocument();
  });

  it('selects the first position by default', () => {
    renderIt();
    expect(detailText()).toContain('detail g1');
    expect(screen.getByRole('button', { name: 'row g1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows the clicked position', () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'row g2' }));
    expect(detailText()).toContain('detail g2');
  });

  it('falls back to the first row when the filter hides the selection', () => {
    requests = { [FEN_A]: answered };
    renderIt();
    expect(detailText()).toContain('detail g1');
    fireEvent.click(screen.getByRole('tab', { name: /not asked/i }));
    expect(detailText()).toContain('detail g2');
  });

  it('shows the empty message instead of a detail panel', () => {
    thinks = [];
    renderIt();
    expect(screen.queryByTestId('detail')).not.toBeInTheDocument();
    expect(screen.getByText(/No moves crossed the 30s/)).toBeInTheDocument();
  });

  it('keeps load more available when no position qualifies', () => {
    thinks = [];
    renderIt();
    expect(
      screen.getByRole('button', { name: 'load more' }),
    ).toBeInTheDocument();
  });
});

describe('<LongThinks /> actions', () => {
  it('marks an unseen answer seen when opening the question', async () => {
    requests = { [FEN_A]: { ...answered, response_seen_at: null } };
    renderIt();
    expect(screen.getByRole('button', { name: 'row g1' })).toHaveAttribute(
      'data-new',
      'true',
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ask' }));
    });
    expect(markResponseSeen).toHaveBeenCalledWith('r1');
    expect(mutate).toHaveBeenCalled();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('leaves a seen answer alone', async () => {
    requests = {
      [FEN_A]: { ...answered, response_seen_at: '2026-10-22T00:00Z' },
    };
    renderIt();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ask' }));
    });
    expect(markResponseSeen).not.toHaveBeenCalled();
  });

  it('opens the game modal from the detail panel', () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'game' }));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('asks the coach from the game modal', async () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'game' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'modal ask' }));
    });
    // Game modal swapped for the coaching one, which has no ask handler.
    expect(screen.getAllByTestId('modal')).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: 'modal ask' }),
    ).not.toBeInTheDocument();
  });

  it('opens full-screen detail on mobile and closes it with back', () => {
    renderIt();
    const wrapper = () => screen.getByTestId('detail').parentElement!;
    expect(wrapper()).toHaveAttribute('data-mobile-open', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'row g2' }));
    expect(wrapper()).toHaveAttribute('data-mobile-open', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect(wrapper()).toHaveAttribute('data-mobile-open', 'false');
  });

  it('closes full-screen detail with Escape', () => {
    renderIt();
    const wrapper = () => screen.getByTestId('detail').parentElement!;
    fireEvent.click(screen.getByRole('button', { name: 'row g2' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(wrapper()).toHaveAttribute('data-mobile-open', 'false');
  });

  it('leaves Escape to an open modal', () => {
    renderIt();
    const wrapper = () => screen.getByTestId('detail').parentElement!;
    fireEvent.click(screen.getByRole('button', { name: 'row g2' }));
    fireEvent.click(screen.getByRole('button', { name: 'game' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(wrapper()).toHaveAttribute('data-mobile-open', 'true');
  });

  it('locks page scroll behind full-screen detail', () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'row g2' }));
    expect(document.body).toHaveClass('max-lg:overflow-hidden');
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect(document.body).not.toHaveClass('max-lg:overflow-hidden');
  });
});
