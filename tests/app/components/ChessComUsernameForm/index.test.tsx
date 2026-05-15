import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import ChessComUsernameForm from '@/app/components/ChessComUsernameForm';

describe('<ChessComUsernameForm />', () => {
  it('renders a labelled input and a submit button', () => {
    renderWithIntl(<ChessComUsernameForm onSubmit={() => {}} />);
    expect(screen.getByLabelText(/chess\.com username/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /load games/i }),
    ).toBeInTheDocument();
  });

  it('disables submit while the input is empty', () => {
    renderWithIntl(<ChessComUsernameForm onSubmit={() => {}} />);
    expect(screen.getByRole('button', { name: /load games/i })).toBeDisabled();
  });

  it('enables submit once the user types something', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ChessComUsernameForm onSubmit={() => {}} />);
    await user.type(
      screen.getByLabelText(/chess\.com username/i),
      'magnuscarlsen',
    );
    expect(screen.getByRole('button', { name: /load games/i })).toBeEnabled();
  });

  it('calls onSubmit with the trimmed value', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    renderWithIntl(<ChessComUsernameForm onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText(/chess\.com username/i),
      '  hikaru  ',
    );
    await user.click(screen.getByRole('button', { name: /load games/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('hikaru');
  });

  it('keeps submit disabled for whitespace-only input', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    renderWithIntl(<ChessComUsernameForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/chess\.com username/i), '   ');
    expect(screen.getByRole('button', { name: /load games/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
