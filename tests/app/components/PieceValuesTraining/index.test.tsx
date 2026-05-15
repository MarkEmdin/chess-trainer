import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import PieceValuesTraining from '@/app/components/PieceValuesTraining';

describe('<PieceValuesTraining />', () => {
  beforeEach(() => {
    // Math.random() → 0 makes the target deterministic: Math.floor(0 * 40) + 1 = 1
    // (Pawn alone hits the target.)
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders all six pieces in the picker', () => {
    renderWithIntl(<PieceValuesTraining />);
    for (const name of ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King']) {
      expect(screen.getByAltText(name)).toBeInTheDocument();
    }
  });

  it('shows the deterministic target value', () => {
    renderWithIntl(<PieceValuesTraining />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('only shows the Check button once the answer is non-empty', async () => {
    const user = userEvent.setup();
    renderWithIntl(<PieceValuesTraining />);
    expect(
      screen.queryByRole('button', { name: /check answer/i }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByAltText('Pawn'));
    expect(
      screen.getByRole('button', { name: /check answer/i }),
    ).toBeInTheDocument();
  });

  it("congratulates the user when the picked pieces sum to the target", async () => {
    const user = userEvent.setup();
    renderWithIntl(<PieceValuesTraining />);
    // Target is 1, Pawn is 1 → adding a single Pawn is correct.
    await user.click(screen.getByAltText('Pawn'));
    await user.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText(/correct!/i)).toBeInTheDocument();
  });

  it('shows the wrong-answer message when the sum does not match', async () => {
    const user = userEvent.setup();
    renderWithIntl(<PieceValuesTraining />);
    // Target is 1, Knight is 3 → mismatch.
    await user.click(screen.getByAltText('Knight'));
    await user.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText(/wrong, try again/i)).toBeInTheDocument();
  });

  it('removes a piece from the answer when its tile is clicked', async () => {
    const user = userEvent.setup();
    renderWithIntl(<PieceValuesTraining />);
    await user.click(screen.getByAltText('Pawn'));
    // After adding Pawn, two images with alt="Pawn" exist (picker + answer).
    expect(screen.getAllByAltText('Pawn')).toHaveLength(2);

    // Clicking the smaller answer tile removes it. The answer's tile is the
    // last one in document order (rendered below the picker).
    const allPawns = screen.getAllByAltText('Pawn');
    await user.click(allPawns[allPawns.length - 1]);
    expect(screen.getAllByAltText('Pawn')).toHaveLength(1);
    // Check button gone again because answer is empty.
    expect(
      screen.queryByRole('button', { name: /check answer/i }),
    ).not.toBeInTheDocument();
  });

  it('clears the answer and re-rolls the target on Reset', async () => {
    const user = userEvent.setup();
    renderWithIntl(<PieceValuesTraining />);
    await user.click(screen.getByAltText('Pawn'));
    await user.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText(/correct!/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(screen.queryByText(/correct!/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /check answer/i }),
    ).not.toBeInTheDocument();
  });
});
