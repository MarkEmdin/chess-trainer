import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import GamesShell from '@/app/components/GamesShell';
import { useChessComGames } from '@/lib/chesscom/useChessComGames';
import { useLichessGames } from '@/lib/lichess/useLichessGames';
import type { Game } from '@/lib/games/types';

jest.mock('@/lib/chesscom/useChessComGames', () => ({
  useChessComGames: jest.fn(),
}));
jest.mock('@/lib/lichess/useLichessGames', () => ({
  useLichessGames: jest.fn(),
}));
jest.mock('@/lib/auth/profileActions', () => ({
  updateChesscomUsername: jest.fn(),
  updateLichessUsername: jest.fn(),
}));

const mockUseChessComGames = useChessComGames as jest.MockedFunction<
  typeof useChessComGames
>;
const mockUseLichessGames = useLichessGames as jest.MockedFunction<
  typeof useLichessGames
>;

function idleResult() {
  return {
    games: null,
    error: null,
    isLoading: false,
    isNotFound: false,
    hasMore: false,
    isLoadingMore: false,
    loadMoreError: null,
    loadMore: jest.fn(),
  };
}

const makeGame = (id: string): Game => ({
  id,
  url: '',
  pgn: '',
  endTime: new Date(),
  timeClass: 'blitz',
  timeControl: '180',
  increment: 0,
  userColor: 'white',
  user: { username: 'alice', rating: 1500 },
  opponent: { username: 'bob', rating: 1700 },
  result: 'draw',
  finalFen: '',
  clockSnapshots: [],
});

function shell() {
  return renderWithIntl(
    <GamesShell
      isAuthenticated={false}
      initialChesscomUsername={null}
      initialLichessUsername={null}
      emptyMessage="no-games-here"
      renderStatus={({ games }) => `status-${games.length}`}
    >
      {() => <div data-testid="children">CONTENT</div>}
    </GamesShell>,
  );
}

describe('<GamesShell />', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseChessComGames.mockReturnValue(idleResult());
    mockUseLichessGames.mockReturnValue(idleResult());
  });

  it('shows a platform picker and the chess.com form when nothing is saved', () => {
    shell();
    expect(
      screen.getByRole('tab', { name: /chess\.com/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/chess\.com username/i)).toBeInTheDocument();
  });

  it('switching the picker to lichess shows the lichess form', async () => {
    const user = userEvent.setup();
    shell();
    await user.click(screen.getByRole('tab', { name: /lichess/i }));
    expect(screen.getByLabelText(/lichess username/i)).toBeInTheDocument();
  });

  it('loads chess.com games directly with no toggle when only chesscom is saved', () => {
    localStorage.setItem('chesscom-username', 'alice');
    mockUseChessComGames.mockReturnValue({
      ...idleResult(),
      games: [makeGame('a')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    shell();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('status-1')).toBeInTheDocument();
    expect(mockUseLichessGames).toHaveBeenCalledWith(null);
  });

  it('loads lichess games directly with no toggle when only lichess is saved', () => {
    localStorage.setItem('lichess-username', 'bob');
    mockUseLichessGames.mockReturnValue({
      ...idleResult(),
      games: [makeGame('b')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    shell();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('status-1')).toBeInTheDocument();
    expect(mockUseChessComGames).toHaveBeenCalledWith(null);
  });

  it('shows the not-found error when the active platform reports isNotFound', () => {
    localStorage.setItem('chesscom-username', 'ghost');
    mockUseChessComGames.mockReturnValue({
      ...idleResult(),
      games: null,
      error: new Error('fail'),
      isLoading: false,
      isNotFound: true,
    });
    shell();
    expect(screen.getByText(/player not found/i)).toBeInTheDocument();
  });

  it('shows a generic error for any other failure', () => {
    localStorage.setItem('lichess-username', 'alice');
    mockUseLichessGames.mockReturnValue({
      ...idleResult(),
      games: null,
      error: new Error('fail'),
      isLoading: false,
      isNotFound: false,
    });
    shell();
    expect(screen.getByText(/could not load games/i)).toBeInTheDocument();
  });

  it('shows a toggle and switches platforms when both are saved', async () => {
    localStorage.setItem('chesscom-username', 'alice');
    localStorage.setItem('lichess-username', 'bob');
    mockUseChessComGames.mockReturnValue({
      ...idleResult(),
      games: [makeGame('a'), makeGame('a2')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    mockUseLichessGames.mockReturnValue({
      ...idleResult(),
      games: [makeGame('b')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    const user = userEvent.setup();
    shell();

    expect(screen.getByText('status-2')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /lichess/i }));
    expect(screen.getByText('status-1')).toBeInTheDocument();
  });

  it('clears the saved username for the active platform on change-user click', async () => {
    localStorage.setItem('chesscom-username', 'alice');
    mockUseChessComGames.mockReturnValue({
      ...idleResult(),
      games: [makeGame('a')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    const user = userEvent.setup();
    shell();
    await user.click(screen.getByRole('button', { name: /change user/i }));
    expect(localStorage.getItem('chesscom-username')).toBeNull();
  });

  it('shows the chess.com form after change-user even when lichess is still saved', async () => {
    localStorage.setItem('chesscom-username', 'alice');
    localStorage.setItem('lichess-username', 'bob');
    mockUseChessComGames.mockReturnValue({
      ...idleResult(),
      games: [makeGame('a')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    const user = userEvent.setup();
    shell();
    await user.click(screen.getByRole('button', { name: /change user/i }));
    expect(screen.getByLabelText(/chess\.com username/i)).toBeInTheDocument();
  });

  it('shows the lichess form after change-user when only lichess was saved', async () => {
    localStorage.setItem('lichess-username', 'bob');
    mockUseLichessGames.mockReturnValue({
      ...idleResult(),
      games: [makeGame('b')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    const user = userEvent.setup();
    shell();
    await user.click(screen.getByRole('button', { name: /change user/i }));
    expect(screen.getByLabelText(/lichess username/i)).toBeInTheDocument();
  });
});
