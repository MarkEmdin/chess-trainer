import { renderWithIntl, screen } from '@/tests/test-utils';
import AuthForm from '@/app/components/AuthForm';

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
  signIn: jest.fn(),
  signUp: jest.fn(),
}));

describe('<AuthForm />', () => {
  it('shows a "Forgot password?" link in login mode', () => {
    renderWithIntl(<AuthForm mode="login" />);
    expect(
      screen.getByRole('link', { name: /forgot password/i }),
    ).toHaveAttribute('href', '/forgot-password');
  });

  it('does not show a "Forgot password?" link in register mode', () => {
    renderWithIntl(<AuthForm mode="register" />);
    expect(
      screen.queryByRole('link', { name: /forgot password/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a notice passed in by the page', () => {
    renderWithIntl(<AuthForm mode="login" notice="Link expired." />);
    expect(screen.getByRole('status')).toHaveTextContent('Link expired.');
  });
});
