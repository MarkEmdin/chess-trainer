import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import ThresholdSelector from '@/app/components/LongThinks/ThresholdSelector';

describe('<ThresholdSelector />', () => {
  it('renders one button per preset (15 / 30 / 45 / 60 / 90)', () => {
    renderWithIntl(<ThresholdSelector value={45} onChange={() => {}} />);
    for (const seconds of [15, 30, 45, 60, 90]) {
      expect(
        screen.getByRole('button', { name: new RegExp(`${seconds}s`) }),
      ).toBeInTheDocument();
    }
  });

  it('marks the active preset with the default Button variant and others with outline', () => {
    renderWithIntl(<ThresholdSelector value={60} onChange={() => {}} />);
    const active = screen.getByRole('button', { name: /^60s$/ });
    const inactive = screen.getByRole('button', { name: /^30s$/ });
    expect(active).toHaveAttribute('data-variant', 'default');
    expect(inactive).toHaveAttribute('data-variant', 'outline');
  });

  it('calls onChange with the clicked preset value', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderWithIntl(<ThresholdSelector value={45} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /^30s$/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(30);
  });

  it('shows the threshold label from translations', () => {
    renderWithIntl(<ThresholdSelector value={45} onChange={() => {}} />);
    expect(screen.getByText(/threshold/i)).toBeInTheDocument();
  });
});
