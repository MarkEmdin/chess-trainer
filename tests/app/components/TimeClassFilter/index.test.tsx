import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import TimeClassFilter from '@/app/components/TimeClassFilter';

describe('<TimeClassFilter />', () => {
  it('renders a labelled group with one toggle per time control', () => {
    renderWithIntl(
      <TimeClassFilter value={['blitz', 'rapid']} onChange={() => {}} />,
    );
    expect(
      screen.getByRole('group', { name: 'Time controls' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bullet' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Blitz' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Rapid' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('button', { name: 'Daily' })).toBeNull();
  });

  it('turns a selected time control off', async () => {
    const onChange = jest.fn();
    renderWithIntl(
      <TimeClassFilter value={['bullet', 'blitz', 'rapid']} onChange={onChange} />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Bullet' }));
    expect(onChange).toHaveBeenCalledWith(['blitz', 'rapid']);
  });

  it('turns an unselected time control on, keeping the canonical order', async () => {
    const onChange = jest.fn();
    renderWithIntl(<TimeClassFilter value={['rapid']} onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Bullet' }));
    expect(onChange).toHaveBeenCalledWith(['bullet', 'rapid']);
  });

  it('does not let the last selected time control be turned off', async () => {
    const onChange = jest.fn();
    renderWithIntl(<TimeClassFilter value={['blitz']} onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Blitz' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
