import { act, fireEvent, renderWithIntl, screen } from '@/tests/test-utils';
import LongThinks from '@/app/components/LongThinks';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3';

jest.mock('next/dynamic', () => () => function ModalStub() {
  return <div data-testid="modal" />;
});

jest.mock('@/app/components/GamesShell', () => ({
  __esModule: true,
  default: ({
    children,
  }: {
    children: (v: { games: unknown[] }) => React.ReactNode;
  }) => <>{children({ games: [] })}</>,
}));

jest.mock('@/lib/games/longThinks', () => ({
  collectLongThinks: () => [
    {
      think: {
        gameId: 'g1',
        moveIndex: 5,
        fullMoveNumber: 3,
        san: 'Nf3',
        color: 'white',
        fenBefore: FEN,
        seconds: 47,
      },
      game: { id: 'g1', url: 'u', pgn: '', userColor: 'white', endTime: new Date() },
    },
  ],
}));

jest.mock('@/lib/chesscom/useStoredThreshold', () => ({
  useStoredThreshold: () => [30, () => {}],
}));

jest.mock('@/app/components/LongThinks/LongThinkCard', () => ({
  __esModule: true,
  default: (props: { hasNewAnswer: boolean; onAskCoach: () => void }) => (
    <button data-new={String(props.hasNewAnswer)} onClick={props.onAskCoach}>
      ask
    </button>
  ),
}));

let request: Record<string, unknown> = {};
const mutate = jest.fn();
jest.mock('@/lib/coaching/useMyCoachingRequests', () => ({
  useMyCoachingRequests: () => ({ data: { [FEN]: request }, mutate }),
}));

const markResponseSeen = jest.fn();
jest.mock('@/lib/coaching/actions', () => ({
  markResponseSeen: (id: string) => markResponseSeen(id),
}));

const answered = {
  id: 'r1',
  fen: FEN,
  responses: [{ body: 'ok' }],
};

const renderIt = () =>
  renderWithIntl(
    <LongThinks
      isAuthenticated
      initialChesscomUsername={null}
      initialLichessUsername={null}
    />,
  );

beforeEach(() => {
  markResponseSeen.mockReset();
  markResponseSeen.mockResolvedValue(undefined);
  mutate.mockClear();
});

describe('<LongThinks /> new answers', () => {
  it('marks an unseen answer seen when its thread is opened, then refetches', async () => {
    request = { ...answered, response_seen_at: null };
    renderIt();
    expect(screen.getByRole('button', { name: 'ask' })).toHaveAttribute(
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
    request = { ...answered, response_seen_at: '2026-10-22T00:00Z' };
    renderIt();
    expect(screen.getByRole('button', { name: 'ask' })).toHaveAttribute(
      'data-new',
      'false',
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ask' }));
    });
    expect(markResponseSeen).not.toHaveBeenCalled();
  });
});
