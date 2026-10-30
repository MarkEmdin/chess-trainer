import { Chess } from 'chess.js';
import { useEffect, useImperativeHandle, type Ref } from 'react';
import type { JSONContent } from '@tiptap/core';
import {
  act,
  fireEvent,
  renderWithIntl,
  screen,
  waitFor,
} from '../../../test-utils';
import CoachingModal from '@/app/components/CoachingModal';
import type { MessageContent, Segment } from '@/lib/coaching/content';
import { recordMove } from '@/lib/coaching/moveRecorder';
import type { CoachingThreadData } from '@/lib/coaching/types';
import type {
  MoveEditorApi,
  RecorderStore,
} from '@/app/components/CoachingModal/MoveEditor';

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

// The real editor is covered in MoveEditor.test.tsx. Here a textarea stands
// in for it: typed text comes first, then every chip the recorder knows.
jest.mock('@/app/components/CoachingModal/MoveEditor', () => {
  const actual = jest.requireActual(
    '@/app/components/CoachingModal/MoveEditor',
  );
  function StubEditor({
    store,
    label,
    onSegmentsChange,
    onFocus,
    initialDoc,
    onDocChange,
    ref,
  }: {
    store: RecorderStore;
    label: string;
    onSegmentsChange: (s: Segment[]) => void;
    onFocus: () => void;
    initialDoc?: JSONContent;
    onDocChange?: (doc: JSONContent) => void;
    ref?: Ref<MoveEditorApi>;
  }) {
    const initialText = initialDoc?.content?.[0]?.content?.[0]?.text ?? '';
    const report = (text: string) =>
      onSegmentsChange([
        ...(text ? [{ t: 'text' as const, text }] : []),
        ...Object.values(store.get().chips).map((c) => ({
          t: 'moves' as const,
          ...c,
        })),
      ]);
    useImperativeHandle(ref, () => ({
      move(from, to) {
        const result = recordMove(store.get(), from, to);
        if ('error' in result) return false;
        store.update(() => result.state);
        report(
          (document.querySelector('#stub-editor') as HTMLTextAreaElement).value,
        );
        return true;
      },
      focus() {},
    }));
    // Like the real editor: a restored draft reports its text once.
    useEffect(() => {
      if (initialText) report(initialText);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <textarea
        id="stub-editor"
        // Not a field of the form: React resets form fields after an action,
        // and the real editor is a contenteditable that it never touches.
        form="no-form"
        aria-label={label}
        onFocus={onFocus}
        defaultValue={initialText}
        onChange={(e) => {
          report(e.target.value);
          onDocChange?.({
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: e.target.value }],
              },
            ],
          });
        }}
      />
    );
  }
  return { ...actual, __esModule: true, default: StubEditor };
});

const createCoachingRequest = jest.fn();
const respondToRequest = jest.fn();
jest.mock('@/lib/coaching/actions', () => ({
  createCoachingRequest: (prev: unknown, fd: FormData) =>
    createCoachingRequest(prev, fd),
  respondToRequest: (prev: unknown, fd: FormData) => respondToRequest(prev, fd),
}));

jest.mock('@/app/components/TelegramPrompt', () => ({
  __esModule: true,
  default: () => <div data-testid="telegram-prompt" />,
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

const editor = () => screen.getByRole('textbox');
const frame = () => screen.getByTestId('variation-board-frame');

// Focus the text (recording starts) and play g8-f6 on the board.
function playNf6() {
  fireEvent.focus(editor());
  act(() => {
    board.onPieceDrop!({ sourceSquare: 'g8', targetSquare: 'f6' });
  });
}

function submittedForm(mock: jest.Mock): FormData {
  return mock.mock.calls[0][1] as FormData;
}

function sentContent(mock: jest.Mock): MessageContent {
  return JSON.parse(String(submittedForm(mock).get('content')));
}

beforeEach(() => {
  // Unmounting a writable modal saves its draft; start every test clean.
  localStorage.clear();
  createCoachingRequest.mockReset().mockResolvedValue({
    success: true,
    requestId: 'r1',
  });
  respondToRequest.mockReset().mockResolvedValue({ success: true });
});

describe('CoachingModal', () => {
  it.each([
    [true, true],
    [false, false],
  ])(
    'offers Telegram after a question when the server says %s',
    async (telegramPrompt, shown) => {
      createCoachingRequest.mockResolvedValue({
        success: true,
        requestId: 'r1',
        telegramPrompt,
      });
      renderWithIntl(
        <CoachingModal
          {...baseProps}
          mode="student"
          thread={undefined}
          ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
        />,
      );
      fireEvent.change(editor(), { target: { value: 'Why?' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send to coach' }));
      await screen.findByRole('status');
      expect(!!screen.queryByTestId('telegram-prompt')).toBe(shown);
    },
  );

  it('never offers Telegram after a coach reply', async () => {
    renderWithIntl(
      <CoachingModal {...baseProps} mode="coach" thread={thread()} />,
    );
    fireEvent.change(editor(), { target: { value: 'Play Nf6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await screen.findByRole('status');
    expect(screen.queryByTestId('telegram-prompt')).not.toBeInTheDocument();
  });

  it('lets the student ask with text and moves played on the board', async () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={undefined}
        ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
      />,
    );
    fireEvent.change(editor(), { target: { value: 'Is this fine? ' } });
    playNf6();
    fireEvent.click(screen.getByRole('button', { name: 'Send to coach' }));
    await waitFor(() => expect(createCoachingRequest).toHaveBeenCalled());
    const fd = submittedForm(createCoachingRequest);
    expect(fd.get('body')).toBe('Is this fine? 3… Nf6');
    expect(Object.values(sentContent(createCoachingRequest).lines)).toEqual([
      ['Nf6'],
    ]);
    expect(fd.get('fen')).toBe(FEN);
    expect(fd.get('move_index')).toBe('5');
    expect(fd.get('move_san')).toBe('3. Nf3');
    expect(fd.get('game_url')).toBe('https://lichess.org/abc');
    expect(fd.has('variation')).toBe(false);
  });

  it('records only while the text is focused', () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={undefined}
        ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
      />,
    );
    expect(frame()).not.toHaveClass('ring-green-600');
    expect(board.onPieceDrop).toBeUndefined();
    fireEvent.focus(editor());
    expect(frame()).toHaveClass('ring-green-600');
    fireEvent.pointerDown(screen.getByText('Ask the coach'));
    expect(frame()).not.toHaveClass('ring-green-600');
  });

  it('keeps recording through clicks on the board', () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={undefined}
        ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
      />,
    );
    fireEvent.focus(editor());
    fireEvent.pointerDown(screen.getByTestId('board'));
    expect(frame()).toHaveClass('ring-green-600');
  });

  it('keeps the text when the server returns an error', async () => {
    createCoachingRequest.mockResolvedValue({ error: 'boom' });
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={undefined}
        ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
      />,
    );
    fireEvent.change(editor(), { target: { value: 'My idea' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send to coach' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    expect(editor()).toHaveValue('My idea');
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
    const send = () => screen.getByRole('button', { name: 'Send to coach' });
    expect(send()).toBeDisabled();
    fireEvent.change(editor(), { target: { value: 'a'.repeat(8001) } });
    expect(screen.getByText('8001 / 8000')).toHaveClass('text-destructive');
    expect(send()).toBeDisabled();
    fireEvent.change(editor(), { target: { value: 'a\nb' } });
    expect(screen.getByText('3 / 8000')).not.toHaveClass('text-destructive');
    expect(send()).toBeEnabled();
  });

  it("shows the coach the question's variation and replies with moves", async () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Back to position' }));

    fireEvent.change(editor(), { target: { value: 'Yes, develop: ' } });
    playNf6();
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await waitFor(() => expect(respondToRequest).toHaveBeenCalled());
    const fd = submittedForm(respondToRequest);
    expect(fd.get('request_id')).toBe('r1');
    expect(fd.get('body')).toBe('Yes, develop: 3… Nf6');
    expect(Object.values(sentContent(respondToRequest).lines)).toEqual([
      ['Nf6'],
    ]);
  });

  it('opens a chip of an inline message at its move, with drawings', () => {
    const content: MessageContent = {
      v: 1,
      segments: [
        { t: 'text', text: 'After ' },
        { t: 'moves', line: 'l1', from: 0, to: 2 },
      ],
      lines: { l1: ['Nf6', 'Nc3'] },
      drawings: { 'l1:2': { arrows: [['f6', 'e4']], circles: [] } },
    };
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="student"
        thread={thread({
          responses: [
            {
              body: 'After 3… Nf6 4. Nc3',
              created_at: '2026-10-21T10:00:00Z',
              variation: null,
              content,
            },
          ],
        })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '3… Nf6 4. Nc3' }));
    const after = new Chess(FEN);
    after.move('Nf6');
    after.move('Nc3');
    expect(screen.getByTestId('board')).toHaveAttribute(
      'data-position',
      after.fen(),
    );
    expect(screen.getByRole('button', { name: '3… Nf6 4. Nc3' })).toHaveClass(
      'ring-2',
    );
  });

  it("lets the student step through the coach's old variation", () => {
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
  });

  it('focusing the text brings the board back to the key position', () => {
    renderAsking();
    fireEvent.click(screen.getByRole('button', { name: 'Previous move' }));
    fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.getByTestId('board')).toHaveAttribute(
      'data-position',
      KEY_FEN,
    );
  });

  it('back to key position returns the board there', () => {
    renderAsking();
    fireEvent.click(screen.getByRole('button', { name: 'Previous move' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to key position' }),
    );
    expect(screen.getByTestId('board')).toHaveAttribute(
      'data-position',
      KEY_FEN,
    );
  });

  it('clicking the starred move returns to the key position', () => {
    renderAsking();
    fireEvent.click(screen.getByRole('button', { name: '4. Ba4' }));
    fireEvent.click(screen.getByRole('button', { name: /3\. Bb5 ★/ }));
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

  it('scrolls the current move into view', () => {
    const scrolled: Element[] = [];
    // jsdom has no scrollIntoView; record the calls instead.
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    try {
      renderAsking();
      expect(scrolled).toContain(
        screen.getByRole('button', { name: /3\. Bb5 ★/ }),
      );
      fireEvent.click(screen.getByRole('button', { name: '4. Ba4' }));
      expect(scrolled[scrolled.length - 1]).toBe(
        screen.getByRole('button', { name: '4. Ba4' }),
      );
    } finally {
      Element.prototype.scrollIntoView = original;
    }
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
    fireEvent.focus(screen.getByRole('textbox'));
    expect(
      screen.queryByRole('button', { name: 'Previous move' }),
    ).not.toBeInTheDocument();
  });

  it('links to the game when a url is given', () => {
    renderWithIntl(
      <CoachingModal
        {...gameProps}
        mode="coach"
        thread={thread({ fen: KEY_FEN })}
        gameUrl="https://lichess.org/abc"
      />,
    );
    const link = screen.getByRole('link', { name: 'Open game' });
    expect(link).toHaveAttribute('href', 'https://lichess.org/abc');
    expect(link).toHaveAttribute('target', '_blank');
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

  const PGN_WITH_CLOCKS = `[White "alice"]
[Black "bob"]
[WhiteElo "1500"]
[BlackElo "1620"]
[TimeControl "180+0"]

1. e4 {[%clk 0:02:58]} 1... e5 {[%clk 0:02:55]} 2. Nf3 {[%clk 0:02:40]} 2... Nc6 {[%clk 0:02:30]} 3. Bb5 {[%clk 0:01:10]} 3... a6 {[%clk 0:02:20]} *`;

  const rowOf = (name: string) =>
    screen.getByText(name).closest('[data-slot="player-row"]') as HTMLElement;

  it('shows both players with clocks and marks the student for the coach', () => {
    renderWithIntl(
      <CoachingModal
        {...gameProps}
        game={{ pgn: PGN_WITH_CLOCKS, moveIndex: 5 }}
        mode="coach"
        subtitle="asked by alice"
        thread={thread({ fen: KEY_FEN, pgn: PGN_WITH_CLOCKS })}
      />,
    );
    expect(
      screen.getByText(/asked by alice · played White/),
    ).toBeInTheDocument();
    expect(rowOf('alice')).toHaveTextContent('(1500)');
    expect(rowOf('alice')).toHaveTextContent(/asked the question/);
    expect(rowOf('alice')).toHaveTextContent(/to move/i);
    expect(rowOf('alice')).toHaveTextContent('02:40');
    expect(rowOf('bob')).toHaveTextContent('02:30');
    expect(rowOf('bob')).not.toHaveTextContent(/asked the question/);

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(rowOf('alice')).toHaveTextContent('01:10');
    expect(rowOf('bob')).toHaveTextContent(/to move/i);
  });

  it('tells the student which color they played', () => {
    renderWithIntl(
      <CoachingModal
        {...gameProps}
        game={{ pgn: PGN_WITH_CLOCKS, moveIndex: 5 }}
        mode="student"
        thread={undefined}
        ask={{ gameUrl: 'https://lichess.org/abc', moveIndex: 5 }}
      />,
    );
    expect(screen.getByText(/You played White/)).toBeInTheDocument();
    expect(rowOf('alice')).toHaveTextContent(/you/);
  });

  it('names the color even without a saved game', () => {
    renderWithIntl(
      <CoachingModal
        {...baseProps}
        mode="coach"
        subtitle="asked by alice"
        thread={thread()}
      />,
    );
    // FEN has black to move: the student played Black.
    expect(
      screen.getByText(/asked by alice · played Black/),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-slot="player-row"]')).toBeNull();
  });
});

describe('CoachingModal drafts', () => {
  const ASK_KEY = 'coaching-draft:ask:https://lichess.org/abc:5';
  const askProps = {
    ...baseProps,
    mode: 'student' as const,
    thread: undefined,
    ask: { gameUrl: 'https://lichess.org/abc', moveIndex: 5 },
  };
  const savedText = (key: string) =>
    JSON.parse(localStorage.getItem(key) ?? 'null')?.doc?.content?.[0]
      ?.content?.[0]?.text;

  beforeEach(() => localStorage.clear());

  it('saves the question as it is typed and brings it back on reopen', async () => {
    const { unmount } = renderWithIntl(<CoachingModal {...askProps} />);
    fireEvent.change(editor(), { target: { value: 'Is this fine?' } });
    await waitFor(() => expect(savedText(ASK_KEY)).toBe('Is this fine?'));
    unmount();

    renderWithIntl(<CoachingModal {...askProps} />);
    expect(editor()).toHaveValue('Is this fine?');
  });

  it('keeps the last edit when the modal closes before the save delay', () => {
    const { unmount } = renderWithIntl(<CoachingModal {...askProps} />);
    fireEvent.change(editor(), { target: { value: 'Closed at once' } });
    unmount();
    expect(savedText(ASK_KEY)).toBe('Closed at once');
  });

  it('sends a restored draft as it was', async () => {
    const { unmount } = renderWithIntl(<CoachingModal {...askProps} />);
    fireEvent.change(editor(), { target: { value: 'Is this fine?' } });
    await waitFor(() => expect(savedText(ASK_KEY)).toBe('Is this fine?'));
    unmount();

    renderWithIntl(<CoachingModal {...askProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send to coach' }));
    await waitFor(() => expect(createCoachingRequest).toHaveBeenCalled());
    expect(submittedForm(createCoachingRequest).get('body')).toBe(
      'Is this fine?',
    );
  });

  it('deletes the draft once the question is sent', async () => {
    renderWithIntl(<CoachingModal {...askProps} />);
    fireEvent.change(editor(), { target: { value: 'Is this fine?' } });
    await waitFor(() => expect(savedText(ASK_KEY)).toBe('Is this fine?'));
    fireEvent.click(screen.getByRole('button', { name: 'Send to coach' }));
    await waitFor(() => expect(localStorage.getItem(ASK_KEY)).toBeNull());
  });

  it('keeps the draft when sending fails', async () => {
    createCoachingRequest.mockResolvedValue({ error: 'boom' });
    renderWithIntl(<CoachingModal {...askProps} />);
    fireEvent.change(editor(), { target: { value: 'Is this fine?' } });
    await waitFor(() => expect(savedText(ASK_KEY)).toBe('Is this fine?'));
    fireEvent.click(screen.getByRole('button', { name: 'Send to coach' }));
    await screen.findByText('boom');
    expect(savedText(ASK_KEY)).toBe('Is this fine?');
  });

  it('keys the coach’s response by request', async () => {
    renderWithIntl(
      <CoachingModal {...baseProps} mode="coach" thread={thread()} />,
    );
    fireEvent.change(editor(), { target: { value: 'Play Nf6' } });
    await waitFor(() =>
      expect(savedText('coaching-draft:reply:r1')).toBe('Play Nf6'),
    );
  });

  it('deletes the coach’s draft even when the refreshed thread already has the answer', async () => {
    let finish: (v: { success: true }) => void = () => {};
    respondToRequest.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { rerender } = renderWithIntl(
      <CoachingModal {...baseProps} mode="coach" thread={thread()} />,
    );
    fireEvent.change(editor(), { target: { value: 'Play Nf6' } });
    await waitFor(() =>
      expect(savedText('coaching-draft:reply:r1')).toBe('Play Nf6'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await waitFor(() => expect(respondToRequest).toHaveBeenCalled());
    // revalidatePath re-renders the admin page with the answer in place,
    // landing with (here: just before) the action's own result.
    rerender(
      <CoachingModal
        {...baseProps}
        mode="coach"
        thread={thread({
          responses: [
            { body: 'Play Nf6', created_at: '2026-10-23', variation: null },
          ],
        })}
      />,
    );
    await act(async () => finish({ success: true }));
    await waitFor(() =>
      expect(localStorage.getItem('coaching-draft:reply:r1')).toBeNull(),
    );
  });

  it('leaves storage alone when there is nothing to write', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem');
    renderWithIntl(
      <CoachingModal {...baseProps} mode="student" thread={thread()} />,
    );
    expect(getItem).not.toHaveBeenCalled();
    getItem.mockRestore();
  });
});
