import { fireEvent, render, screen } from '@testing-library/react';
import ChessboardWithNotation from '@/app/components/ChessboardWithNotation';

jest.mock('react-chessboard', () => ({
  Chessboard: () => (
    <div data-testid="board" data-square="e2">
      <span data-testid="piece" data-piece="wP" />
    </div>
  ),
}));

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const touchAt = (x: number) => ({ clientX: x, clientY: 0 });

function touch(piece: HTMLElement, endX: number) {
  fireEvent.touchStart(piece, { touches: [touchAt(0)] });
  fireEvent.touchEnd(piece, { touches: [], changedTouches: [touchAt(endX)] });
}

describe('<ChessboardWithNotation />', () => {
  describe('a touch on a square', () => {
    function renderBoard(allowDragging: boolean) {
      const onSquareClick = jest.fn();
      render(
        <ChessboardWithNotation
          position={START}
          boardOrientation="white"
          allowDragging={allowDragging}
          onSquareClick={onSquareClick}
        />,
      );
      return { onSquareClick, piece: screen.getByTestId('piece') };
    }

    it('counts as a click on its square', () => {
      const { onSquareClick, piece } = renderBoard(true);
      touch(piece, 4);
      expect(onSquareClick).toHaveBeenCalledTimes(1);
      expect(onSquareClick).toHaveBeenCalledWith(
        expect.objectContaining({ square: 'e2' }),
      );
    });

    it('stops the follow-up mouse events that would take focus', () => {
      const { piece } = renderBoard(true);
      fireEvent.touchStart(piece, { touches: [touchAt(0)] });
      const notPrevented = fireEvent.touchEnd(piece, {
        touches: [],
        changedTouches: [touchAt(0)],
      });
      expect(notPrevented).toBe(false);
    });

    it('is a drag, not a click, once the finger moves', () => {
      const { onSquareClick, piece } = renderBoard(true);
      touch(piece, 30);
      expect(onSquareClick).not.toHaveBeenCalled();
    });

    it('is left to the library when pieces cannot be dragged', () => {
      const { onSquareClick, piece } = renderBoard(false);
      touch(piece, 0);
      expect(onSquareClick).not.toHaveBeenCalled();
    });
  });

  it('draws coordinates by default', () => {
    render(
      <ChessboardWithNotation position={START} boardOrientation="white" />,
    );
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
  });

  it('can hide coordinates', () => {
    render(
      <ChessboardWithNotation
        position={START}
        boardOrientation="white"
        showCoordinates={false}
      />,
    );
    expect(screen.getByTestId('board')).toBeInTheDocument();
    expect(screen.queryByText('8')).not.toBeInTheDocument();
    expect(screen.queryByText('a')).not.toBeInTheDocument();
  });
});
