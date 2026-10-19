import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import UsernameForm from '@/app/components/UsernameForm';

describe('<UsernameForm />', () => {
  it('shows the chess.com label when platform is chesscom', () => {
    renderWithIntl(<UsernameForm platform="chesscom" onSubmit={() => {}} />);
    expect(screen.getByLabelText(/chess\.com username/i)).toBeInTheDocument();
  });

  it('shows the lichess label when platform is lichess', () => {
    renderWithIntl(<UsernameForm platform="lichess" onSubmit={() => {}} />);
    expect(screen.getByLabelText(/lichess username/i)).toBeInTheDocument();
  });

  it('disables submit while the input is empty', () => {
    renderWithIntl(<UsernameForm platform="chesscom" onSubmit={() => {}} />);
    expect(
      screen.getByRole('button', { name: /load games/i }),
    ).toBeDisabled();
  });

  it('calls onSubmit with the trimmed value', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    renderWithIntl(<UsernameForm platform="lichess" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/lichess username/i), '  hikaru  ');
    await user.click(screen.getByRole('button', { name: /load games/i }));
    expect(onSubmit).toHaveBeenCalledWith('hikaru');
  });

  it('keeps submit disabled for whitespace-only input', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    renderWithIntl(<UsernameForm platform="chesscom" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/chess\.com username/i), '   ');
    expect(
      screen.getByRole('button', { name: /load games/i }),
    ).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
