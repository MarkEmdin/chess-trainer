import { fireEvent, renderWithIntl, screen, waitFor } from '@/tests/test-utils';
import CheckEmail from '@/app/components/CheckEmail';
import { resendConfirmation } from '@/lib/auth/actions';

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
  resendConfirmation: jest.fn(async () => ({
    success: 'If the account needs confirming, a new email was sent.',
  })),
}));

describe('<CheckEmail />', () => {
  it('tells the user where the link went', () => {
    renderWithIntl(<CheckEmail maskedEmail="a***@gmail.com" />);
    expect(
      screen.getByRole('heading', { name: 'Check your email' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/a\*\*\*@gmail\.com/)).toBeInTheDocument();
  });

  it('resends the email on request', async () => {
    renderWithIntl(<CheckEmail maskedEmail="a***@gmail.com" />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));
    await waitFor(() => expect(resendConfirmation).toHaveBeenCalled());
    expect(
      await screen.findByText(
        'If the account needs confirming, a new email was sent.',
      ),
    ).toBeInTheDocument();
  });
});
