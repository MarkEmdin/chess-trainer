import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import ResetPasswordForm from '@/app/components/ResetPasswordForm';
import { updatePassword } from '@/lib/auth/actions';

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
  updatePassword: jest.fn(),
}));

const mockedUpdatePassword = updatePassword as jest.Mock;

describe('<ResetPasswordForm />', () => {
  beforeEach(() => {
    mockedUpdatePassword.mockReset();
  });

  it('renders new password and confirm password fields', () => {
    renderWithIntl(<ResetPasswordForm />);
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('submits both fields and shows the success message with a login link', async () => {
    mockedUpdatePassword.mockResolvedValue({
      success: 'Password updated. You can now log in.',
    });
    const user = userEvent.setup();
    renderWithIntl(<ResetPasswordForm />);
    await user.type(screen.getByLabelText(/new password/i), 'abcdef');
    await user.type(screen.getByLabelText(/confirm password/i), 'abcdef');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/login');
    const formData = mockedUpdatePassword.mock.calls[0][1] as FormData;
    expect(formData.get('password')).toBe('abcdef');
    expect(formData.get('confirmPassword')).toBe('abcdef');
  });

  it('shows the error message when the action returns one', async () => {
    mockedUpdatePassword.mockResolvedValue({
      error: "Passwords don't match.",
    });
    const user = userEvent.setup();
    renderWithIntl(<ResetPasswordForm />);
    await user.type(screen.getByLabelText(/new password/i), 'abcdef');
    await user.type(screen.getByLabelText(/confirm password/i), 'xyzxyz');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Passwords don't match.",
    );
  });
});
