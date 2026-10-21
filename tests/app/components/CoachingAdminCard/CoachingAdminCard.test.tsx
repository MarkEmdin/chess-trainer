import { fireEvent, renderWithIntl, screen } from '../../../test-utils';
import CoachingAdminCard, {
  type AdminCoachingRequest,
} from '@/app/components/CoachingAdminCard';

// The modal is loaded with next/dynamic; the stub shows which mode the card
// opened it in.
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

function request(
  overrides: Partial<AdminCoachingRequest> = {},
): AdminCoachingRequest {
  return {
    id: 'r1',
    user_nickname: 'alice',
    game_url: 'https://lichess.org/abc',
    fen: FEN,
    move_san: '3. Nf3',
    body: 'What now?',
    created_at: '2026-10-20T10:00:00Z',
    variation: null,
    move_index: 5,
    pgn: null,
    responses: [],
    ...overrides,
  };
}

describe('CoachingAdminCard', () => {
  it('offers Reply instead of an inline form when unanswered', () => {
    renderWithIntl(<CoachingAdminCard request={request()} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(screen.getByTestId('coaching-modal')).toHaveAttribute(
      'data-mode',
      'coach',
    );
  });

  it('links to the game on its platform', () => {
    renderWithIntl(<CoachingAdminCard request={request({})} />);
    expect(screen.getByRole('link', { name: 'Open game' })).toHaveAttribute(
      'href',
      'https://lichess.org/abc',
    );
  });

  it('passes the saved game and its link to the modal', () => {
    renderWithIntl(
      <CoachingAdminCard
        request={request({ pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6' })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    const modal = screen.getByTestId('coaching-modal');
    expect(modal).toHaveAttribute('data-pgn', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
    expect(modal).toHaveAttribute('data-move-index', '5');
    expect(modal).toHaveAttribute('data-game-url', 'https://lichess.org/abc');
  });

  it('passes no game when none was saved', () => {
    renderWithIntl(<CoachingAdminCard request={request({})} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(screen.getByTestId('coaching-modal')).toHaveAttribute(
      'data-pgn',
      '',
    );
  });

  it('offers Open when already answered', () => {
    renderWithIntl(
      <CoachingAdminCard
        request={request({
          responses: [
            { body: 'Play Nf6', created_at: '2026-10-21', variation: null },
          ],
        })}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Reply' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it("previews the question's variation", () => {
    renderWithIntl(
      <CoachingAdminCard request={request({ variation: ['Nf6', 'Nc3'] })} />,
    );
    expect(screen.getByText('3… Nf6 4. Nc3')).toBeInTheDocument();
  });
});
