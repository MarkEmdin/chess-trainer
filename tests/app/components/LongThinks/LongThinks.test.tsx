import { act, fireEvent, renderWithIntl, screen } from '@/tests/test-utils';
import LongThinks from '@/app/components/LongThinks';

const FEN_A = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3';
const FEN_B = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

// Both modals load through next/dynamic, so one stub stands in for each.
// It shows which move and thread the coaching modal got, and exposes the
// game modal's ask handler (asking about move 9) and the seen callback.
jest.mock(
  'next/dynamic',
  () => () =>
    function ModalStub({
      onAsk,
      onSeen,
      target,
      thread,
    }: {
      onAsk?: (t: { moveIndex: number; fen: string; label: string }) => void;
      onSeen?: () => void;
      target?: { moveIndex: number };
      thread?: { id: string };
    }) {
      return (
        <div
          data-testid="modal"
          data-target={target?.moveIndex ?? ''}
          data-thread={thread?.id ?? ''}
        >
          {onAsk && (
            <button
              onClick={() =>
                onAsk({ moveIndex: 9, fen: 'FEN_X', label: '5. Bc4' })
              }
            >
              modal ask
            </button>
          )}
          {onSeen && <button onClick={onSeen}>modal seen</button>}
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
      filterNotice: React.ReactNode;
    }) => React.ReactNode;
  }) => (
    <>
      {children({
        games: [],
        loadMore: <button>load more</button>,
        timeFilter: <div>time chips</div>,
        filterNotice: mockFilterNotice,
      })}
    </>
  ),
}));

let mockFilterNotice: React.ReactNode = null;

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

let mockLower: number | null = 15;
const mockSetThreshold = jest.fn();
let thinks = [item('g1', FEN_A), item('g2', FEN_B)];
jest.mock('@/lib/games/longThinks', () => ({
  collectLongThinks: () => thinks,
  lowerThresholdWithThinks: () => mockLower,
}));

jest.mock('@/lib/chesscom/useStoredThreshold', () => ({
  useStoredThreshold: () => [30, mockSetThreshold],
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

const renderIt = (isAuthenticated = true) =>
  renderWithIntl(
    <LongThinks
      isAuthenticated={isAuthenticated}
      initialChesscomUsername={null}
      initialLichessUsername={null}
    />,
  );

const detailText = () => screen.getByTestId('detail').textContent;

beforeEach(() => {
  localStorage.clear();
  mockFilterNotice = null;
  mockLower = 15;
  mockSetThreshold.mockClear();
  thinks = [item('g1', FEN_A), item('g2', FEN_B)];
  requests = {};
  markResponseSeen.mockReset();
  markResponseSeen.mockResolvedValue(undefined);
  mutate.mockClear();
});

describe('<LongThinks /> position kept through signing up', () => {
  it('remembers the position a guest asks about', () => {
    renderIt(false);
    fireEvent.click(screen.getByRole('button', { name: 'row g2' }));
    fireEvent.click(screen.getByRole('button', { name: 'ask' }));
    expect(localStorage.getItem('pending-ask')).toBe('g2-5');
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('selects the remembered position once signed in, and forgets it', () => {
    localStorage.setItem('pending-ask', 'g2-5');
    renderIt();
    expect(detailText()).toContain('detail g2');
    expect(screen.getByTestId('detail').parentElement).toHaveAttribute(
      'data-mobile-open',
      'true',
    );
    expect(localStorage.getItem('pending-ask')).toBeNull();
  });

  it('forgets a remembered position that is not loaded', () => {
    localStorage.setItem('pending-ask', 'gone-5');
    renderIt();
    expect(detailText()).toContain('detail g1');
    expect(localStorage.getItem('pending-ask')).toBeNull();
  });

  it('does not restore for a guest', () => {
    localStorage.setItem('pending-ask', 'g2-5');
    renderIt(false);
    expect(detailText()).toContain('detail g1');
    expect(localStorage.getItem('pending-ask')).toBe('g2-5');
  });
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

  it('offers the highest lower threshold that finds moves', () => {
    thinks = [];
    renderIt();
    fireEvent.click(
      screen.getByRole('button', { name: 'Show moves from 15 s' }),
    );
    expect(mockSetThreshold).toHaveBeenCalledWith(15);
  });

  it('suggests a rapid game when no threshold finds moves', () => {
    thinks = [];
    mockLower = null;
    renderIt();
    expect(
      screen.getByText(/no long thinks in these games/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /show moves from/i }),
    ).toBeNull();
  });

  it('keeps load more available when no position qualifies', () => {
    thinks = [];
    renderIt();
    expect(
      screen.getByRole('button', { name: 'load more' }),
    ).toBeInTheDocument();
  });

  it('keeps its controls and shows the filter notice when the time filter hides every game', () => {
    thinks = [];
    mockFilterNotice = <p>filter hid everything</p>;
    renderIt();
    expect(screen.getByText('filter hid everything')).toBeInTheDocument();
    expect(screen.queryByText(/no moves crossed/i)).toBeNull();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByText('time chips')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'load more' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('detail')).toBeNull();
  });
});

describe('<LongThinks /> actions', () => {
  it("opens the card's question with its thread", async () => {
    requests = { [FEN_A]: answered };
    renderIt();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ask' }));
    });
    const modal = screen.getByTestId('modal');
    expect(modal).toHaveAttribute('data-target', '5');
    expect(modal).toHaveAttribute('data-thread', 'r1');
  });

  it('refetches questions once an answer is marked seen', async () => {
    renderIt();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ask' }));
    });
    fireEvent.click(screen.getByRole('button', { name: 'modal seen' }));
    expect(mutate).toHaveBeenCalled();
  });

  it('opens the game modal from the detail panel', () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'game' }));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it("asks the coach about the viewer's move", async () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'game' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'modal ask' }));
    });
    // Game modal swapped for the coaching one, on the move asked about.
    expect(screen.getAllByTestId('modal')).toHaveLength(1);
    expect(screen.getByTestId('modal')).toHaveAttribute('data-target', '9');
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
