import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen, waitFor } from '@/tests/test-utils';
import AccountMenu from '@/app/components/AccountMenu';

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

const signOut = jest.fn();
jest.mock('@/lib/auth/actions', () => ({ signOut: () => signOut() }));

const trigger = () => screen.getByRole('button', { name: 'Account menu' });

async function open(props: { nickname: string; isAdmin: boolean }) {
  renderWithIntl(<AccountMenu {...props} />);
  await userEvent.click(trigger());
}

beforeEach(() => jest.clearAllMocks());

describe('AccountMenu', () => {
  it.each([
    ['ann', 'A'],
    ['', '?'],
  ])('shows the initial of %j', (nickname, initial) => {
    renderWithIntl(<AccountMenu nickname={nickname} isAdmin={false} />);
    expect(trigger()).toHaveTextContent(initial);
  });

  it('lists the nickname, profile, questions and logout', async () => {
    await open({ nickname: 'ann', isAdmin: false });
    expect(screen.getByText('ann')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(
      screen.getByRole('menuitem', { name: 'My coaching' }),
    ).toHaveAttribute('href', '/coaching');
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Admin' }),
    ).not.toBeInTheDocument();
  });

  it('links admins to the admin page', async () => {
    await open({ nickname: 'ann', isAdmin: true });
    expect(screen.getByRole('menuitem', { name: 'Admin' })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('logs out', async () => {
    await open({ nickname: 'ann', isAdmin: false });
    await userEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });
});
