import { render, screen } from '@testing-library/react';
import ChessboardWithNotation from '@/app/components/ChessboardWithNotation';

jest.mock('react-chessboard', () => ({
  Chessboard: () => <div data-testid="board" />,
}));

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('<ChessboardWithNotation />', () => {
  it('draws coordinates by default', () => {
    render(<ChessboardWithNotation position={START} boardOrientation="white" />);
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
