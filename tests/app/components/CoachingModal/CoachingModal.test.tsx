import { Chess } from 'chess.js';
import {
  act,
  fireEvent,
  renderWithIntl,
  screen,
  waitFor,
} from '../../../test-utils';
import CoachingModal from '@/app/components/CoachingModal';
import type { CoachingThreadData } from '@/lib/coaching/types';

type BoardProps = {
  position: string;
  onPieceDrop?: (args: {
    sourceSquare: string;
    targetSquare: string | null;
  }) => boolean;
};

let board: BoardProps;
jest.mock('@/app/components/ChessboardWithNotation', () => ({
  __esModule: true,
  default: (props: BoardProps) => {
    board = props;
    return <div data-testid="board" data-position={props.position} />;
  },
}));

const createCoachingRequest = jest.fn();
const respondToRequest = jest.fn();
jest.mock('@/lib/coaching/actions', () => ({
  createCoachingRequest: (prev: unknown, fd: FormData) =>
    createCoachingRequest(prev, fd),
  respondToRequest: (prev: unknown, fd: FormData) => respondToRequest(prev, fd),
}));

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 3 3';

function thread(
  overrides: Partial<CoachingThreadData> = {},
): CoachingThreadData {
  return {
    id: 'r1',
    fen: FEN,
    body: 'What now?',
    created_at: '2026-10-20T10:00:00Z',
    variation: null,
    move_index: 5,
    pgn: null,
    responses: [],
    ...overrides,
  };
}

const baseProps = {
  fen: FEN,
  orientation: 'black' as const,
  moveLabel: '3. Nf3',
  onClose: jest.fn(),
};

function recordNf6() {
  fireEvent.click(screen.getByRole('button', { name: 'Record variation' }));
  act(() => {
    board.onPieceDrop!({ sourceSquare: 'g8', targetSquare: 'f6' });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
}

function submittedForm(mock: jest.Mock): FormData {
  return mock.mock.calls[0][1] as FormData;
}

beforeEach(() => {
  createCoachingRequest.mockReset().mockResolvedValue({
    success: true,
    requestId: 'r1',
  });
  respondToRequest.mockReset().mockResolvedValue({ success: true });
});

describe('CoachingModal', () => {
  it('lets the student ask with text and a variation', async () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={undefined}
        ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
      />,
    );
    recordNf6();
    expect(screen.getByText('3… Nf6')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Is Nf6 fine?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send to coach' }));
    await waitFor(() => expect(createCoachingRequest).toHaveBeenCalled());
    const fd = submittedForm(createCoachingRequest);
    expect(fd.get('body')).toBe('Is Nf6 fine?');
    expect(fd.get('fen')).toBe(FEN);
    expect(fd.get('move_index')).toBe('5');
    expect(fd.get('move_san')).toBe('3. Nf3');
    expect(fd.get('game_url')).toBe('https://lichess.org/abc');
    expect(fd.get('variation')).toBe('["Nf6"]');
  });

  it('sends no variation field when none is recorded', async () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={undefined}
        ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Help' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send to coach' }));
    await waitFor(() => expect(createCoachingRequest).toHaveBeenCalled());
    expect(submittedForm(createCoachingRequest).has('variation')).toBe(false);
  });

  it('keeps the text and variation when the server returns an error', async () => {
    createCoachingRequest.mockResolvedValue({ error: 'boom' });
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={undefined}
        ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'My idea' },
    });
    recordNf6();
    fireEvent.click(screen.getByRole('button', { name: 'Send to coach' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    expect(screen.getByRole('textbox')).toHaveValue('My idea');
    expect(screen.getByText('Variation')).toBeInTheDocument();
  });

  it('counts characters and blocks sending over the limit', () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={undefined}
        ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
      />,
    );
    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'a'.repeat(4001) } });
    expect(screen.getByText('4001 / 4000')).toHaveClass('text-destructive');
    expect(
      screen.getByRole('button', { name: 'Send to coach' }),
    ).toBeDisabled();
    fireEvent.change(textbox, { target: { value: 'a\r\nb' } });
    expect(screen.getByText('3 / 4000')).not.toHaveClass('text-destructive');
    expect(screen.getByRole('button', { name: 'Send to coach' })).toBeEnabled();
  });

  it("shows the coach the question's variation and sends a reply with one", async () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="coach"
        thread={thread({ variation: ['Nf6', 'Nc3'] })}
      />,
    );
    expect(screen.getByText('What now?')).toBeInTheDocument();
    expect(screen.getByText('3… Nf6')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View variation' }));
    expect(
      screen.getByRole('button', { name: 'Back to position' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to position' }));

    recordNf6();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Yes, develop.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await waitFor(() => expect(respondToRequest).toHaveBeenCalled());
    const fd = submittedForm(respondToRequest);
    expect(fd.get('request_id')).toBe('r1');
    expect(fd.get('body')).toBe('Yes, develop.');
    expect(fd.get('variation')).toBe('["Nf6"]');
  });

  it("lets the student step through the coach's variation", () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={thread({
          responses: [
            {
              body: 'Play Nf6.',
              created_at: '2026-10-21T10:00:00Z',
              variation: ['Nf6'],
            },
          ],
        })}
      />,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Record variation' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View variation' }));
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    const after = new Chess(FEN);
    after.move('Nf6');
    expect(screen.getByTestId('board')).toHaveAttribute(
      'data-position',
      after.fen(),
    );
  });

  it('renders old threads without variations as before', () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={thread({
          responses: [
            { body: 'Hi', created_at: '2026-10-21T10:00:00Z', variation: null },
          ],
        })}
      />,
    );
    expect(screen.getByText('What now?')).toBeInTheDocument();
    expect(screen.getByText('Hi')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'View variation' }),
    ).not.toBeInTheDocument();
  });

  it('disables viewing while recording', () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="coach"
        thread={thread({ variation: ['Nf6'] })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Record variation' }));
    expect(
      screen.getByRole('button', { name: 'View variation' }),
    ).toBeDisabled();
  });
});

describe('CoachingModal game browsing', () => {
  const GAME_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6';
  // Key position: before half-move 5 (3. Bb5), white to move.
  const KEY_FEN = (() => {
    const chess = new Chess();
    ['e4', 'e5', 'Nf3', 'Nc6'].forEach((m) => chess.move(m));
    return chess.fen();
  })();

  const gameProps = {
    ...baseProps,
    fen: KEY_FEN,
    orientation: 'white' as const,
    moveLabel: '3. Bb5',
    game: { pgn: GAME_PGN, moveIndex: 5 },
  };

  function renderAsking() {
    return renderWithIntl(
      <CoachingModal
        {...gameProps}
        mode="student"
        thread={undefined}
        ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
      />,
    );
  }

  const banner = () => screen.queryByText(/On the board now/);

  it('opens on the key position with the key move starred', () => {
    renderAsking();
    expect(screen.getByTestId('board')).toHaveAttribute(
      'data-position',
      KEY_FEN,
    );
    expect(screen.getByRole('button', { name: /3\. Bb5 ★/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(banner()).not.toBeInTheDocument();
  });

  it('locks writing away from the key position and keeps the text', () => {
    renderAsking();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'idea' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Previous move' }));
    // The key board is after 2… Nc6; one step back shows it after 2. Nf3.
    expect(banner()).toHaveTextContent('2. Nf3');
    expect(banner()).toHaveTextContent('3. Bb5');
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('textbox')).toHaveValue('idea');
    expect(
      screen.getByRole('button', { name: 'Record variation' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Send to coach' }),
    ).toBeDisabled();
  });

  it('back to key position unlocks', () => {
    renderAsking();
    fireEvent.click(screen.getByRole('button', { name: 'Previous move' }));
    const backButtons = screen.getAllByRole('button', {
      name: 'Back to key position',
    });
    fireEvent.click(backButtons[backButtons.length - 1]);
    expect(banner()).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeEnabled();
    expect(screen.getByTestId('board')).toHaveAttribute(
      'data-position',
      KEY_FEN,
    );
  });

  it('clicking the starred move returns to the key position', () => {
    renderAsking();
    fireEvent.click(screen.getByRole('button', { name: '4. Ba4' }));
    expect(banner()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /3\. Bb5 ★/ }));
    expect(banner()).not.toBeInTheDocument();
    expect(screen.getByTestId('board')).toHaveAttribute(
      'data-position',
      KEY_FEN,
    );
  });

  it('ignores arrow keys typed in the comment', () => {
    renderAsking();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowLeft' });
    expect(screen.getByTestId('board')).toHaveAttribute(
      'data-position',
      KEY_FEN,
    );
  });

  it('steps through the game with arrow keys', () => {
    renderAsking();
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(banner()).toHaveTextContent('3. Bb5');
    expect(screen.getByTestId('board')).not.toHaveAttribute(
      'data-position',
      KEY_FEN,
    );
  });

  it('returns to the key position after viewing a variation', () => {
    renderWithIntl(
      <CoachingModal
        {...gameProps}
        mode="student"
        thread={thread({
          fen: KEY_FEN,
          responses: [
            {
              body: 'Try this',
              created_at: '2026-10-21T10:00:00Z',
              variation: ['Bc4'],
            },
          ],
        })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous move' }));
    fireEvent.click(screen.getByRole('button', { name: 'View variation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to position' }));
    expect(screen.getByTestId('board')).toHaveAttribute(
      'data-position',
      KEY_FEN,
    );
    expect(screen.getByRole('button', { name: /3\. Bb5 ★/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('sends the pgn with a new question', async () => {
    renderAsking();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Why Bb5?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send to coach' }));
    await waitFor(() => expect(createCoachingRequest).toHaveBeenCalled());
    expect(submittedForm(createCoachingRequest).get('pgn')).toBe(GAME_PGN);
  });

  it('hides game navigation while recording', () => {
    renderAsking();
    fireEvent.click(screen.getByRole('button', { name: 'Record variation' }));
    expect(
      screen.queryByRole('button', { name: 'Previous move' }),
    ).not.toBeInTheDocument();
  });

  it('shows no game navigation without a pgn', () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={undefined}
        ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Back to key position' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Previous move' }),
    ).not.toBeInTheDocument();
  });
});
