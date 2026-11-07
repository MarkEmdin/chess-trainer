import { Chess } from 'chess.js';
import { fireEvent, renderWithIntl, screen } from '../../../test-utils';
import LineDemo from '@/app/components/LineDemo';
import {
  MOVES_CHIPS,
  MOVES_LINE,
  MOVES_START,
} from '@/app/constants/aboutExamples';

jest.mock('@/app/components/ChessboardWithNotation', () => ({
  __esModule: true,
  default: ({ position }: { position: string }) => (
    <div data-testid="board" data-position={position} />
  ),
}));

function fenAfter(plies: number) {
  const chess = new Chess();
  MOVES_LINE.slice(0, plies).forEach((san) => chess.move(san));
  return chess.fen();
}

const position = () => screen.getByTestId('board').dataset.position;
const button = (name: string) => screen.getByRole('button', { name });

function renderDemo() {
  renderWithIntl(
    <LineDemo
      line={MOVES_LINE}
      start={MOVES_START}
      chips={MOVES_CHIPS}
      text={['Play ', 0, ' but not ', 1]}
      hint="Tap a line"
    />,
  );
}

describe('LineDemo', () => {
  it('starts before the chips', () => {
    renderDemo();
    expect(position()).toBe(fenAfter(MOVES_START));
    expect(button('Previous move')).toBeDisabled();
  });

  it('opens a chip at its first move', () => {
    renderDemo();
    const chip = button('4… d5 5. exd5');
    fireEvent.click(chip);
    expect(position()).toBe(fenAfter(8));
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('steps through the line with the arrows', () => {
    renderDemo();
    fireEvent.click(button('Next move'));
    fireEvent.click(button('Next move'));
    expect(position()).toBe(fenAfter(MOVES_START + 2));
    fireEvent.click(button('Previous move'));
    expect(position()).toBe(fenAfter(MOVES_START + 1));
  });

  it('marks the chip the step is in', () => {
    renderDemo();
    fireEvent.click(button('4… d5 5. exd5'));
    fireEvent.click(button('Next move'));
    fireEvent.click(button('Next move'));
    expect(button('5… Nxd5 6. Nxf7 Kxf7 7. Qf3+')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('steps with the keyboard arrows after a chip is tapped', () => {
    renderDemo();
    const chip = button('4… d5 5. exd5');
    fireEvent.click(chip);
    fireEvent.keyDown(chip, { key: 'ArrowRight' });
    expect(position()).toBe(fenAfter(9));
    fireEvent.keyDown(chip, { key: 'ArrowLeft' });
    expect(position()).toBe(fenAfter(8));
  });

  it('stays inside the line at both ends of the keyboard arrows', () => {
    renderDemo();
    const chip = button('4… d5 5. exd5');
    fireEvent.keyDown(chip, { key: 'ArrowLeft' });
    expect(position()).toBe(fenAfter(MOVES_START));
    fireEvent.click(button('Go to end'));
    fireEvent.keyDown(chip, { key: 'ArrowRight' });
    expect(position()).toBe(fenAfter(MOVES_LINE.length));
  });

  it('keeps focus in the demo when an arrow button disables itself', () => {
    renderDemo();
    const end = button('Go to end');
    end.focus();
    fireEvent.click(end);
    expect(screen.getByTestId('line-demo')).toHaveFocus();
  });

  it('jumps to the end and back to the start', () => {
    renderDemo();
    fireEvent.click(button('Go to end'));
    expect(position()).toBe(fenAfter(MOVES_LINE.length));
    expect(button('Next move')).toBeDisabled();
    fireEvent.click(button('Go to start'));
    expect(position()).toBe(fenAfter(MOVES_START));
  });
});
