import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen, within } from '@/tests/test-utils';
import GamesShell from '@/app/components/GamesShell';
import { useChessComGames } from '@/lib/chesscom/useChessComGames';
import { useLichessGames } from '@/lib/lichess/useLichessGames';
import {
  updateChesscomUsername,
  updateLichessUsername,
} from '@/lib/auth/profileActions';
import type { Game } from '@/lib/games/types';
import type { UseGamesResult } from '@/lib/games/useGamesPages';

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

function idleResult(): UseGamesResult {
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

function shell(
  children: () => React.ReactNode = () => (
    <div data-testid="children">CONTENT</div>
  ),
) {
  return renderWithIntl(
    <GamesShell
      isAuthenticated={false}
      initialChesscomUsername={null}
      initialLichessUsername={null}
      emptyMessage="no-games-here"
      renderStatus={({ games }) => `status-${games.length}`}
    >
      {children}
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

  describe('load more', () => {
    function loaded(overrides: Partial<UseGamesResult> = {}) {
      localStorage.setItem('chesscom-username', 'alice');
      const result = {
        ...idleResult(),
        games: [makeGame('a')],
        ...overrides,
      };
      mockUseChessComGames.mockReturnValue(result);
      return result;
    }

    it('shows load more when hasMore and calls loadMore on click', async () => {
      const result = loaded({ hasMore: true });
      const user = userEvent.setup();
      shell();
      await user.click(screen.getByRole('button', { name: /load more games/i }));
      expect(result.loadMore).toHaveBeenCalled();
    });

    it('hides load more when hasMore is false', () => {
      loaded({ hasMore: false });
      shell();
      expect(
        screen.queryByRole('button', { name: /load more games/i }),
      ).not.toBeInTheDocument();
    });

    it('disables load more while loading more', () => {
      loaded({ hasMore: true, isLoadingMore: true });
      shell();
      expect(
        screen.getByRole('button', { name: /load more games/i }),
      ).toBeDisabled();
    });

    it('shows the load-more error with retry and hides the button', async () => {
      const result = loaded({ hasMore: true, loadMoreError: new Error('x') });
      const user = userEvent.setup();
      shell();
      expect(screen.getByText(/couldn't load more games/i)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /load more games/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('children')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /retry/i }));
      expect(result.loadMore).toHaveBeenCalled();
    });

    it('shows load more even when children render nothing', () => {
      loaded({ hasMore: true });
      shell(() => null);
      expect(
        screen.getByRole('button', { name: /load more games/i }),
      ).toBeInTheDocument();
    });

    it('lets the consumer place load more', () => {
      loaded({ hasMore: true });
      renderWithIntl(
        <GamesShell
          isAuthenticated={false}
          initialChesscomUsername={null}
          initialLichessUsername={null}
          emptyMessage="no-games-here"
          renderStatus={({ games }) => `status-${games.length}`}
          loadMoreInChildren
        >
          {({ loadMore }) => <div data-testid="kids">{loadMore}</div>}
        </GamesShell>,
      );
      expect(
        screen.getAllByRole('button', { name: /load more games/i }),
      ).toHaveLength(1);
      expect(
        within(screen.getByTestId('kids')).getByRole('button', {
          name: /load more games/i,
        }),
      ).toBeInTheDocument();
    });

    it('status line counts all loaded games', () => {
      loaded({ games: [makeGame('a'), makeGame('b'), makeGame('c')] });
      shell();
      expect(screen.getByText('status-3')).toBeInTheDocument();
    });
  });
});

describe('<GamesShell /> nickname entered before signing up', () => {
  const signedIn = (
    chesscom: string | null = null,
    lichess: string | null = null,
  ) =>
    renderWithIntl(
      <GamesShell
        isAuthenticated
        initialChesscomUsername={chesscom}
        initialLichessUsername={lichess}
        emptyMessage="no-games-here"
        renderStatus={({ games }) => `status-${games.length}`}
      >
        {() => <div data-testid="children">CONTENT</div>}
      </GamesShell>,
    );

  beforeEach(() => {
    localStorage.clear();
    jest.mocked(updateChesscomUsername).mockClear();
    jest.mocked(updateLichessUsername).mockClear();
    mockUseChessComGames.mockReturnValue(idleResult());
    mockUseLichessGames.mockReturnValue(idleResult());
  });

  it('moves it into an empty profile', () => {
    localStorage.setItem('chesscom-username', 'alice');
    signedIn();
    expect(updateChesscomUsername).toHaveBeenCalledWith('alice');
    expect(mockUseChessComGames).toHaveBeenLastCalledWith('alice');
    expect(localStorage.getItem('chesscom-username')).toBeNull();
  });

  it('moves a lichess nickname too', () => {
    localStorage.setItem('lichess-username', 'bob');
    signedIn();
    expect(updateLichessUsername).toHaveBeenCalledWith('bob');
  });

  it('never replaces a nickname in the profile', () => {
    localStorage.setItem('chesscom-username', 'alice');
    signedIn(null, 'saved');
    expect(updateChesscomUsername).not.toHaveBeenCalled();
    expect(localStorage.getItem('chesscom-username')).toBe('alice');
  });

  it('does not bring it back after change user', async () => {
    localStorage.setItem('chesscom-username', 'alice');
    mockUseChessComGames.mockReturnValue({
      ...idleResult(),
      games: [makeGame('a')],
    });
    const user = userEvent.setup();
    signedIn();
    await user.click(screen.getByRole('button', { name: /change user/i }));
    expect(updateChesscomUsername).toHaveBeenLastCalledWith(null);
    expect(mockUseChessComGames).toHaveBeenLastCalledWith(null);
  });
});

describe('<GamesShell /> time-control filter', () => {
  const withClass = (id: string, timeClass: Game['timeClass']): Game => ({
    ...makeGame(id),
    timeClass,
  });

  function loaded(games: Game[], extra: Partial<UseGamesResult> = {}) {
    localStorage.setItem('chesscom-username', 'alice');
    mockUseChessComGames.mockReturnValue({ ...idleResult(), games, ...extra });
    mockUseLichessGames.mockReturnValue(idleResult());
  }

  function filteredShell(loadMoreInChildren = false) {
    return renderWithIntl(
      <GamesShell
        isAuthenticated={false}
        initialChesscomUsername={null}
        initialLichessUsername={null}
        emptyMessage="no-games-here"
        renderStatus={({ games }) => `status-${games.length}`}
        loadMoreInChildren={loadMoreInChildren}
      >
        {({ games, timeFilter, filterNotice, loadMore }) => (
          <div>
            {timeFilter}
            {filterNotice}
            {loadMoreInChildren && <div data-testid="child-load-more">{loadMore}</div>}
            <ul>
              {games.map((g) => (
                <li key={g.id}>game-{g.id}</li>
              ))}
            </ul>
          </div>
        )}
      </GamesShell>,
    );
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it('never passes daily games to children or status', () => {
    loaded([withClass('z', 'blitz'), withClass('d', 'daily')]);
    filteredShell();
    expect(screen.getByText('game-z')).toBeInTheDocument();
    expect(screen.queryByText('game-d')).toBeNull();
    expect(screen.getByText('status-1')).toBeInTheDocument();
  });

  it('hides games of a time control the user turned off', async () => {
    loaded([withClass('b', 'bullet'), withClass('z', 'blitz')]);
    filteredShell();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Bullet' }));
    expect(screen.queryByText('game-b')).toBeNull();
    expect(screen.getByText('game-z')).toBeInTheDocument();
    expect(screen.getByText('status-1')).toBeInTheDocument();
    expect(localStorage.getItem('games-time-classes')).toBe('["blitz","rapid"]');
  });

  it('keeps chips and load-more visible when nothing loaded matches', () => {
    localStorage.setItem('games-time-classes', '["rapid"]');
    loaded([withClass('b', 'bullet')], { hasMore: true });
    filteredShell();
    expect(screen.queryByText('game-b')).toBeNull();
    expect(
      screen.getByText(/no games with the selected time controls/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rapid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    expect(screen.queryByText('no-games-here')).toBeNull();
  });

  it('hands the notice and load-more to children when they own load-more', () => {
    localStorage.setItem('games-time-classes', '["rapid"]');
    loaded([withClass('b', 'bullet')], { hasMore: true });
    filteredShell(true);
    expect(
      screen.getByText(/no games with the selected time controls/i),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('child-load-more')).getByRole('button', {
        name: /load more/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /load more/i })).toHaveLength(1);
    expect(screen.getAllByRole('group', { name: 'Time controls' })).toHaveLength(1);
  });

  it('passes no notice while some games match', () => {
    loaded([withClass('z', 'blitz')]);
    filteredShell();
    expect(
      screen.queryByText(/no games with the selected time controls/i),
    ).toBeNull();
  });

  it('says only daily games were found when every chip is already on', () => {
    loaded([withClass('d', 'daily')]);
    filteredShell();
    expect(screen.getByText(/only daily games/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/no games with the selected time controls/i),
    ).toBeNull();
  });
});
