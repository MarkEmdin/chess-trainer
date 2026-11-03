import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import CoachApplicationForm from '@/app/components/CoachApplicationForm';

const applyForCoach = jest.fn();
jest.mock('@/lib/coaches/actions', () => ({
  applyForCoach: (...a: unknown[]) => applyForCoach(...a),
}));

beforeEach(() => applyForCoach.mockReset());

describe('<CoachApplicationForm />', () => {
  it('prefills the fields it is given', () => {
    renderWithIntl(
      <CoachApplicationForm
        initial={{ chesscom_username: 'ivan', first_name: 'Ivan', title: 'IM' }}
      />,
    );
    expect(screen.getByLabelText('Chess.com username')).toHaveValue('ivan');
    expect(screen.getByLabelText('First name')).toHaveValue('Ivan');
    expect(screen.getByLabelText('Title')).toHaveValue('IM');
  });

  it('offers every title with its full name', () => {
    renderWithIntl(<CoachApplicationForm initial={{}} />);
    expect(
      screen.getByRole('option', { name: 'CMS — Candidate Master of Sport' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(12);
  });

  it('shows field errors next to their fields', async () => {
    applyForCoach.mockResolvedValue({
      errors: { first_name: 'Required.', accounts: 'Add an account.' },
    });
    renderWithIntl(<CoachApplicationForm initial={{}} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Send application' }),
    );
    expect(await screen.findByText('Required.')).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByText('Add an account.')).toBeInTheDocument();
  });

  it('shows a general error', async () => {
    applyForCoach.mockResolvedValue({ error: 'Already pending.' });
    renderWithIntl(<CoachApplicationForm initial={{}} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Send application' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Already pending.',
    );
  });
});
