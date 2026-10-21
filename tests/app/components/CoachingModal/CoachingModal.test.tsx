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
