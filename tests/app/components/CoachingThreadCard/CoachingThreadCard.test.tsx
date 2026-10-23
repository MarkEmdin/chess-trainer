import { act, fireEvent, renderWithIntl, screen } from '../../../test-utils';
import CoachingThreadCard, {
  type CoachingThread,
} from '@/app/components/CoachingThreadCard';

jest.mock(
  'next/dynamic',
  () => () =>
    function CoachingModalStub(props: {
      mode: string;
      game?: { pgn: string; moveIndex: number };
      gameUrl?: string;
      onClose: () => void;
    }) {
      return (
        <div
          data-testid="coaching-modal"
          data-mode={props.mode}
          data-pgn={props.game?.pgn ?? ''}
          data-move-index={props.game?.moveIndex ?? ''}
          data-game-url={props.gameUrl ?? ''}
        >
          <button onClick={props.onClose}>close-stub</button>
        </div>
      );
    },
);
const markResponseSeen = jest.fn();
jest.mock('@/lib/coaching/actions', () => ({
  markResponseSeen: (id: string) => markResponseSeen(id),
}));
jest.mock('@/app/components/ChessboardContainer', () => ({
  __esModule: true,
  default: () => <div data-testid="board" />,
}));

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 3 3';

const thread: CoachingThread = {
  id: 'r1',
  game_url: 'https://lichess.org/abc',
  fen: FEN,
  move_san: '3. Nf3',
  body: 'What now?',
  created_at: '2026-10-20T10:00:00Z',
  variation: null,
  move_index: 5,
  pgn: null,
  responses: [
    { body: 'Play Nf6', created_at: '2026-10-21', variation: ['Nf6'] },
  ],
};

describe('CoachingThreadCard', () => {
  it('opens the thread in the student modal', () => {
    renderWithIntl(<CoachingThreadCard thread={thread} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByTestId('coaching-modal')).toHaveAttribute(
      'data-mode',
      'student',
    );
  });

  it('links to the game on its platform', () => {
    renderWithIntl(<CoachingThreadCard thread={{ ...thread, ...{} }} />);
    expect(screen.getByRole('link', { name: 'Open game' })).toHaveAttribute(
      'href',
      'https://lichess.org/abc',
    );
  });

  it('passes the saved game and its link to the modal', () => {
    renderWithIntl(
      <CoachingThreadCard
        thread={{ ...thread, ...{ pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6' } }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const modal = screen.getByTestId('coaching-modal');
    expect(modal).toHaveAttribute('data-pgn', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
    expect(modal).toHaveAttribute('data-move-index', '5');
    expect(modal).toHaveAttribute('data-game-url', 'https://lichess.org/abc');
  });

  it('passes no game when none was saved', () => {
    renderWithIntl(<CoachingThreadCard thread={{ ...thread, ...{} }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByTestId('coaching-modal')).toHaveAttribute(
      'data-pgn',
      '',
    );
  });

  it("previews the coach's variation", () => {
    renderWithIntl(<CoachingThreadCard thread={thread} />);
    expect(screen.getByText('3… Nf6')).toBeInTheDocument();
  });

  describe('new answer', () => {
    const unseen = { ...thread, response_seen_at: null };

    beforeEach(() => {
      markResponseSeen.mockReset();
      markResponseSeen.mockResolvedValue(undefined);
    });

    it('labels an answer nobody opened yet', () => {
      renderWithIntl(<CoachingThreadCard thread={unseen} />);
      expect(screen.getByText('New answer')).toBeInTheDocument();
    });

    it('marks it seen once when opened, and drops the label', () => {
      renderWithIntl(<CoachingThreadCard thread={unseen} />);
      fireEvent.click(screen.getByRole('button', { name: 'Open' }));
      expect(markResponseSeen).toHaveBeenCalledWith('r1');
      expect(screen.queryByText('New answer')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'close-stub' }));
      fireEvent.click(screen.getByRole('button', { name: 'Open' }));
      expect(markResponseSeen).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['a seen answer', { ...thread, response_seen_at: '2026-10-22T00:00Z' }],
      ['no answer yet', { ...thread, responses: [], response_seen_at: null }],
    ])('leaves %s alone', (_label, t) => {
      renderWithIntl(<CoachingThreadCard thread={t} />);
      expect(screen.queryByText('New answer')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Open' }));
      expect(markResponseSeen).not.toHaveBeenCalled();
    });

    it('still opens the modal when marking fails', async () => {
      markResponseSeen.mockRejectedValue(new Error('offline'));
      renderWithIntl(<CoachingThreadCard thread={unseen} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Open' }));
      });
      expect(screen.getByTestId('coaching-modal')).toBeInTheDocument();
    });
  });
});
