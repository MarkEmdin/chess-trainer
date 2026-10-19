import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import ThresholdSelector from '@/app/components/LongThinks/ThresholdSelector';

describe('<ThresholdSelector />', () => {
  it('renders one segment per preset (15 / 30 / 45 / 60 / 90) in a labelled group', () => {
    renderWithIntl(<ThresholdSelector value={45} onChange={() => {}} />);
    expect(
      screen.getByRole('radiogroup', { name: /threshold/i }),
    ).toBeInTheDocument();
    for (const seconds of [15, 30, 45, 60, 90]) {
      expect(
        screen.getByRole('radio', { name: `${seconds}s` }),
      ).toBeInTheDocument();
    }
  });

  it('marks only the active preset as checked', () => {
    renderWithIntl(<ThresholdSelector value={60} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: '60s' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: '30s' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('calls onChange with the clicked preset value', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderWithIntl(<ThresholdSelector value={45} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: '30s' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(30);
  });
});
