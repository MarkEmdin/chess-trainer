import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen, fireEvent } from '@/tests/test-utils';
import ForgotPasswordForm from '@/app/components/ForgotPasswordForm';
import { requestPasswordReset } from '@/lib/auth/actions';

jest.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('@/lib/auth/actions', () => ({
  requestPasswordReset: jest.fn(),
}));

const mockedRequestPasswordReset = requestPasswordReset as jest.Mock;

describe('<ForgotPasswordForm />', () => {
  beforeEach(() => {
    mockedRequestPasswordReset.mockReset();
  });

  it('renders a labelled nickname field and submit button', () => {
    renderWithIntl(<ForgotPasswordForm />);
    expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send reset link/i }),
    ).toBeInTheDocument();
  });

  it('submits the nickname and shows the neutral success message', async () => {
    mockedRequestPasswordReset.mockResolvedValue({
      success: 'If that account exists, a reset email was sent.',
    });
    const user = userEvent.setup();
    renderWithIntl(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/nickname/i), 'alice');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/reset email was sent/i)).toBeInTheDocument();
    const formData = mockedRequestPasswordReset.mock.calls[0][1] as FormData;
    expect(formData.get('nickname')).toBe('alice');
  });

  it('shows the error message when the action returns one', async () => {
    mockedRequestPasswordReset.mockResolvedValue({
      error: 'All fields are required',
    });
    const { container } = renderWithIntl(<ForgotPasswordForm />);
    const form = container.querySelector('form');
    fireEvent.submit(form!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'All fields are required',
    );
  });
});
