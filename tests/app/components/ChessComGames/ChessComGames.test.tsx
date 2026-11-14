import { act, fireEvent, renderWithIntl, screen } from '@/tests/test-utils';
import ChessComGames from '@/app/components/ChessComGames';

// Both modals load through next/dynamic: one stub shows which props each
// got, and exposes the game modal's ask handler.
jest.mock(
  'next/dynamic',
  () => () =>
    function ModalStub({
      onAsk,
      askedFens,
      isAuthenticated,
      target,
      thread,
    }: {
      onAsk?: (t: { moveIndex: number; fen: string; label: string }) => void;
      askedFens?: ReadonlySet<string>;
      isAuthenticated?: boolean;
      target?: { moveIndex: number };
      thread?: { id: string };
    }) {
      return (
        <div
          data-testid="modal"
          data-asked={askedFens ? [...askedFens].join(',') : ''}
          data-auth={String(isAuthenticated ?? '')}
          data-target={target?.moveIndex ?? ''}
          data-thread={thread?.id ?? ''}
        >
          {onAsk && (
            <button
              onClick={() =>
                onAsk({ moveIndex: 3, fen: 'FEN_A', label: '2. Nf3' })
              }
            >
              modal ask
            </button>
          )}
        </div>
      );
    },
);

const game = { id: 'g1', url: 'u', userColor: 'white' };

jest.mock('@/app/components/GamesShell', () => ({
  __esModule: true,
  default: ({
    children,
  }: {
    children: (v: {
      games: unknown[];
      timeFilter: React.ReactNode;
      filterNotice: React.ReactNode;
    }) => React.ReactNode;
  }) => (
    <>{children({ games: [game], timeFilter: null, filterNotice: null })}</>
  ),
}));

jest.mock('@/app/components/ChessComGames/GamesList', () => ({
  __esModule: true,
  default: ({ onSelect }: { onSelect: (g: unknown) => void }) => (
    <button onClick={() => onSelect(game)}>open game</button>
  ),
}));

const mutate = jest.fn();
let requests: Record<string, { id: string }> = {};
const useMyCoachingRequests = jest.fn((enabled: boolean) => ({
  data: enabled ? requests : undefined,
  mutate,
}));
jest.mock('@/lib/coaching/useMyCoachingRequests', () => ({
  useMyCoachingRequests: (enabled: boolean) => useMyCoachingRequests(enabled),
}));

const renderIt = (isAuthenticated = true) =>
  renderWithIntl(
    <ChessComGames
      isAuthenticated={isAuthenticated}
      initialChesscomUsername="alice"
      initialLichessUsername={null}
    />,
  );

beforeEach(() => {
  requests = {};
  useMyCoachingRequests.mockClear();
});

it('tells the game viewer which positions the student asked about', () => {
  requests = { FEN_A: { id: 'r1' } };
  renderIt();
  fireEvent.click(screen.getByRole('button', { name: 'open game' }));
  const modal = screen.getByTestId('modal');
  expect(modal).toHaveAttribute('data-asked', 'FEN_A');
  expect(modal).toHaveAttribute('data-auth', 'true');
});

it('swaps the game viewer for the question about the chosen move', async () => {
  requests = { FEN_A: { id: 'r1' } };
  renderIt();
  fireEvent.click(screen.getByRole('button', { name: 'open game' }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'modal ask' }));
  });
  const modals = screen.getAllByTestId('modal');
  expect(modals).toHaveLength(1);
  expect(modals[0]).toHaveAttribute('data-target', '3');
  expect(modals[0]).toHaveAttribute('data-thread', 'r1');
});

it("doesn't fetch questions for guests", () => {
  renderIt(false);
  expect(useMyCoachingRequests).toHaveBeenCalledWith(false);
});
