import { Chess } from 'chess.js';
import { act, fireEvent, renderWithIntl, screen } from '../../../test-utils';
import VariationBoard from '@/app/components/CoachingModal/VariationBoard';

type BoardProps = {
  position: string;
  allowDragging?: boolean;
  squareStyles?: Record<string, unknown>;
  onPieceDrop?: (args: {
    sourceSquare: string;
    targetSquare: string | null;
  }) => boolean;
  onSquareClick?: (args: { square: string }) => void;
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

function setup(overrides: Partial<Parameters<typeof VariationBoard>[0]> = {}) {
  const props = {
    fen: START,
    orientation: 'white' as const,
    canRecord: true,
    draft: null,
    onDraftChange: jest.fn(),
    viewing: null,
    onStopViewing: jest.fn(),
    onRecordingChange: jest.fn(),
    game: null,
    boardIndex: 0,
    onBoardIndexChange: jest.fn(),
    locked: false,
    askerColor: 'white' as const,
    askerNote: 'you',
    ...overrides,
  };
  const utils = renderWithIntl(<VariationBoard {...props} />);
  return { props, ...utils };
}

const frame = () => screen.getByTestId('variation-board-frame');

describe('VariationBoard', () => {
  it('shows the record button only when the viewer can record', () => {
    setup({ canRecord: false });
    expect(
      screen.queryByRole('button', { name: 'Record variation' }),
    ).not.toBeInTheDocument();
  });

  it('glows green and enables dragging while recording', () => {
    const { props } = setup();
    expect(frame()).not.toHaveClass('ring-green-600');
    expect(board.allowDragging).toBeFalsy();
    fireEvent.click(screen.getByRole('button', { name: 'Record variation' }));
    expect(frame()).toHaveClass('ring-green-600');
    expect(screen.getByText('Recording variation')).toBeInTheDocument();
    expect(board.allowDragging).toBe(true);
    expect(props.onRecordingChange).toHaveBeenCalledWith(true);
  });

  it('attaches the recorded line on Done and leaves recording', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Record variation' }));
    act(() => {
      board.onPieceDrop!({ sourceSquare: 'e2', targetSquare: 'e4' });
    });
    expect(screen.getByText('1. e4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(props.onDraftChange).toHaveBeenCalledWith(['e4']);
    expect(props.onRecordingChange).toHaveBeenLastCalledWith(false);
    expect(frame()).not.toHaveClass('ring-green-600');
    expect(screen.getByTestId('board')).toHaveAttribute('data-position', START);
  });

  it('records with two taps', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Record variation' }));
    act(() => board.onSquareClick!({ square: 'g1' }));
    act(() => board.onSquareClick!({ square: 'f3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(props.onDraftChange).toHaveBeenCalledWith(['Nf3']);
  });

  it('attaches nothing when Done is pressed with no moves', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Record variation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(props.onDraftChange).toHaveBeenCalledWith(null);
  });

  it('edits an attached draft from its last move', () => {
    const { props } = setup({ draft: ['e4'] });
    expect(screen.getByText('1. e4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('board')).toHaveAttribute(
      'data-position',
      AFTER_E4.fen(),
    );
    act(() => {
      board.onPieceDrop!({ sourceSquare: 'e7', targetSquare: 'e5' });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(props.onDraftChange).toHaveBeenCalledWith(['e4', 'e5']);
  });

  it('removes an attached draft', () => {
    const { props } = setup({ draft: ['e4'] });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(props.onDraftChange).toHaveBeenCalledWith(null);
  });

  it('leaves keys alone while the user types in a text field', () => {
    setup({ canRecord: false, viewing: ['e4', 'e5'] });
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const home = new KeyboardEvent('keydown', {
      key: 'End',
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      textarea.dispatchEvent(home);
    });
    expect(home.defaultPrevented).toBe(false);
    expect(screen.getByTestId('board')).toHaveAttribute('data-position', START);
    textarea.remove();
  });

  it('steps through a viewed variation', () => {
    const { props } = setup({ canRecord: false, viewing: ['e4', 'e5'] });
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
});
