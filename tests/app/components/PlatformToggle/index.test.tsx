import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import PlatformToggle from '@/app/components/PlatformToggle';

describe('<PlatformToggle />', () => {
  it('renders both platform options', () => {
    renderWithIntl(<PlatformToggle value="chesscom" onChange={() => {}} />);
    expect(
      screen.getByRole('tab', { name: /chess\.com/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /lichess/i })).toBeInTheDocument();
  });

  it('marks the active platform as selected', () => {
    renderWithIntl(<PlatformToggle value="lichess" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /lichess/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /chess\.com/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('calls onChange with the clicked platform', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithIntl(<PlatformToggle value="chesscom" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: /lichess/i }));
    expect(onChange).toHaveBeenCalledWith('lichess');
  });
});
