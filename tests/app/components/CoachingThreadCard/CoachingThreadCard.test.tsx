import { fireEvent, renderWithIntl, screen } from '../../../test-utils';
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
    }) {
      return (
        <div
          data-testid="coaching-modal"
          data-mode={props.mode}
          data-pgn={props.game?.pgn ?? ''}
          data-move-index={props.game?.moveIndex ?? ''}
          data-game-url={props.gameUrl ?? ''}
        />
      );
    },
);
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
});
