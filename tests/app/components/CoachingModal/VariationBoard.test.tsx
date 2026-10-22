import { Chess } from 'chess.js';
import { act, fireEvent, renderWithIntl, screen } from '../../../test-utils';
import VariationBoard from '@/app/components/CoachingModal/VariationBoard';

type BoardProps = {
  position: string;
  allowDragging?: boolean;
  squareStyles?: Record<string, Record<string, unknown>>;
  arrows?: [string, string][];
  onPieceDrop?: (args: {
    sourceSquare: string;
    targetSquare: string | null;
  }) => boolean;
  onSquareClick?: (args: { square: string }) => void;
  onRightDrag?: (from: string, to: string) => void;
};

// The stub records the props VariationBoard controls, so tests can drive
// drops/taps the way react-chessboard would.
let board: BoardProps;
jest.mock('@/app/components/ChessboardWithNotation', () => ({
  __esModule: true,
  default: (props: BoardProps) => {
    board = props;
    return <div data-testid="board" data-position={props.position} />;
  },
}));

const START = new Chess().fen();
const AFTER_E4 = new Chess();
AFTER_E4.move('e4');
const AFTER_E5 = new Chess(AFTER_E4.fen());
AFTER_E5.move('e5');

function writing(overrides = {}) {
  return {
    fen: START,
    lastMove: null,
    drawing: { arrows: [], circles: [] },
    onMove: jest.fn(() => true),
    onMark: jest.fn(),
    onClearDrawings: jest.fn(),
    ...overrides,
  };
}

function setup(overrides: Partial<Parameters<typeof VariationBoard>[0]> = {}) {
  const props = {
    fen: START,
    orientation: 'white' as const,
    canWrite: true,
    writing: null,
    viewing: null,
    onStopViewing: jest.fn(),
    game: null,
    boardIndex: 0,
    onBoardIndexChange: jest.fn(),
    askerColor: 'white' as const,
    askerNote: 'you',
    ...overrides,
  };
  const utils = renderWithIntl(<VariationBoard {...props} />);
  return { props, ...utils };
}

const frame = () => screen.getByTestId('variation-board-frame');

describe('VariationBoard', () => {
  it('invites to click the text field when the viewer can write', () => {
    setup();
    expect(
      screen.getByText('Click the text field to start recording'),
    ).toBeInTheDocument();
    expect(frame()).not.toHaveClass('ring-green-600');
    expect(board.allowDragging).toBeFalsy();
  });

  it('says nothing about recording to a reader', () => {
    setup({ canWrite: false });
    expect(
      screen.queryByText('Click the text field to start recording'),
    ).not.toBeInTheDocument();
  });

  it('glows green and plays moves while writing', () => {
    const w = writing();
    setup({ writing: w });
    expect(frame()).toHaveClass('ring-green-600');
    expect(
      screen.getByText('● Recording — moves go into the text'),
    ).toBeInTheDocument();
    expect(board.allowDragging).toBe(true);
    act(() => {
      board.onPieceDrop!({ sourceSquare: 'e2', targetSquare: 'e4' });
    });
    expect(w.onMove).toHaveBeenCalledWith('e2', 'e4');
  });

  it('plays a move with two taps while writing', () => {
    const w = writing();
    setup({ writing: w });
    act(() => board.onSquareClick!({ square: 'g1' }));
    act(() => board.onSquareClick!({ square: 'f3' }));
    expect(w.onMove).toHaveBeenCalledWith('g1', 'f3');
  });

  it('shows and edits drawings while writing', () => {
    const w = writing({ drawing: { arrows: [['e2', 'e4']], circles: ['d4'] } });
    setup({ writing: w });
    expect(board.arrows).toEqual([['e2', 'e4']]);
    expect(board.squareStyles?.d4.backgroundImage).toContain('radial-gradient');
    act(() => board.onRightDrag!('c2', 'c4'));
    expect(w.onMark).toHaveBeenCalledWith('c2', 'c4');
    fireEvent.click(screen.getByRole('button', { name: 'Clear drawings' }));
    expect(w.onClearDrawings).toHaveBeenCalled();
  });

  it('leaves keys alone while the user types in a text field', () => {
    setup({
      canWrite: false,
      viewing: { sans: ['e4', 'e5'], line: null, startPly: 0, drawings: {} },
    });
    // jsdom has no contentEditable property, only the attribute.
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    for (const field of [document.createElement('textarea'), editor]) {
      document.body.appendChild(field);
      const end = new KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
        cancelable: true,
      });
      act(() => {
        field.dispatchEvent(end);
      });
      expect(end.defaultPrevented).toBe(false);
      field.remove();
    }
    expect(screen.getByTestId('board')).toHaveAttribute('data-position', START);
  });

  it('steps through a viewed variation', () => {
    const { props } = setup({
      canWrite: false,
      viewing: { sans: ['e4', 'e5'], line: null, startPly: 0, drawings: {} },
    });
    const position = () =>
      screen.getByTestId('board').getAttribute('data-position');
    expect(position()).toBe(START);
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(position()).toBe(AFTER_E5.fen());
    expect(board.squareStyles).toHaveProperty('e7');
    expect(board.squareStyles).toHaveProperty('e5');
    fireEvent.keyDown(document, { key: 'Home' });
    expect(position()).toBe(START);
    fireEvent.click(screen.getByRole('button', { name: '1. e4' }));
    expect(position()).toBe(AFTER_E4.fen());
    fireEvent.click(screen.getByRole('button', { name: 'Back to position' }));
    expect(props.onStopViewing).toHaveBeenCalled();
  });

  it('opens a viewed line at its start ply with the drawings there', () => {
    setup({
      canWrite: false,
      viewing: {
        sans: ['e4', 'e5'],
        line: 'l1',
        startPly: 2,
        drawings: {
          'l1:2': { arrows: [['g1', 'f3']], circles: ['d4'] },
          'l1:1': { arrows: [], circles: ['e4'] },
        },
      },
    });
    expect(screen.getByTestId('board')).toHaveAttribute(
      'data-position',
      AFTER_E5.fen(),
    );
    expect(board.arrows).toEqual([['g1', 'f3']]);
    expect(board.squareStyles?.d4.backgroundImage).toContain('radial-gradient');
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(board.squareStyles?.e4.backgroundImage).toContain('radial-gradient');
    expect(board.arrows).toEqual([]);
  });
});
