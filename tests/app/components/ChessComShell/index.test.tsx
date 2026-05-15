import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import ChessComShell from '@/app/components/ChessComShell';
import { useChessComGames } from '@/lib/chesscom/useChessComGames';
import type { Game } from '@/lib/chesscom/types';

jest.mock('@/lib/chesscom/useChessComGames', () => ({
  useChessComGames: jest.fn(),
}));

const mockUseChessComGames = useChessComGames as jest.MockedFunction<
  typeof useChessComGames
>;

function setIdle() {
  mockUseChessComGames.mockReturnValue({
    games: null,
    error: null,
    isLoading: false,
    isNotFound: false,
  });
}

function setLoading() {
  mockUseChessComGames.mockReturnValue({
    games: null,
    error: null,
    isLoading: true,
    isNotFound: false,
  });
}

function setError(isNotFound: boolean) {
  mockUseChessComGames.mockReturnValue({
    games: null,
    error: new Error('fail'),
    isLoading: false,
    isNotFound,
  });
}

function setGames(games: Game[]) {
  mockUseChessComGames.mockReturnValue({
    games,
    error: null,
    isLoading: false,
    isNotFound: false,
  });
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

function shell({
  username,
  childrenContent = 'CONTENT',
}: {
  username: string | null;
  childrenContent?: string;
}) {
  if (username) localStorage.setItem('chesscom-username', username);
  return renderWithIntl(
    <ChessComShell
      emptyMessage="no-games-here"
      renderStatus={({ games }) => `status-${games.length}`}
    >
      {() => <div data-testid="children">{childrenContent}</div>}
    </ChessComShell>,
  );
}

describe('<ChessComShell />', () => {
  beforeEach(() => {
    localStorage.clear();
    setIdle();
  });

  it('renders the username form when nothing is saved', () => {
    shell({ username: null });
    expect(screen.getByLabelText(/chess\.com username/i)).toBeInTheDocument();
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });

  it('shows a loading state when fetch is in flight', () => {
    setLoading();
    shell({ username: 'alice' });
    expect(screen.getByText(/loading games/i)).toBeInTheDocument();
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });

  it('shows the not-found error when the player does not exist', () => {
    setError(true);
    shell({ username: 'ghost' });
    expect(screen.getByText(/player not found/i)).toBeInTheDocument();
  });

  it('shows a generic error for any other failure', () => {
    setError(false);
    shell({ username: 'alice' });
    expect(screen.getByText(/could not load games/i)).toBeInTheDocument();
  });

  it('shows the empty message when fetch succeeds but the list is empty', () => {
    setGames([]);
    shell({ username: 'alice' });
    expect(screen.getByText('no-games-here')).toBeInTheDocument();
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });

  it('renders the status line and children when games are present', () => {
    setGames([makeGame('a'), makeGame('b')]);
    shell({ username: 'alice' });
    expect(screen.getByText('status-2')).toBeInTheDocument();
    expect(screen.getByTestId('children')).toHaveTextContent('CONTENT');
  });

  it('clears the saved username when the change-user button is clicked', async () => {
    setGames([makeGame('a')]);
    const user = userEvent.setup();
    shell({ username: 'alice' });
    await user.click(screen.getByRole('button', { name: /change user/i }));
    expect(localStorage.getItem('chesscom-username')).toBeNull();
  });
});
