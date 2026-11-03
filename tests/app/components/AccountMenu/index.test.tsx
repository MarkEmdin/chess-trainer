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

async function open(props: {
  nickname: string;
  role: 'user' | 'coach' | 'admin';
}) {
  renderWithIntl(<AccountMenu {...props} />);
  await userEvent.click(trigger());
}

beforeEach(() => jest.clearAllMocks());

describe('AccountMenu', () => {
  it.each([
    ['ann', 'A'],
    ['', '?'],
  ])('shows the initial of %j', (nickname, initial) => {
    renderWithIntl(<AccountMenu nickname={nickname} role="user" />);
    expect(trigger()).toHaveTextContent(initial);
  });

  // Ghost-button classes turned the circle grey while open and on dark hover.
  it('keeps the primary circle colours in every state', () => {
    renderWithIntl(<AccountMenu nickname="ann" role="user" />);
    expect(trigger().className).not.toMatch(
      /aria-expanded:bg-muted|hover:bg-muted/,
    );
  });

  it('lists the nickname, profile, questions and logout', async () => {
    await open({ nickname: 'ann', role: 'user' });
    expect(screen.getByText('ann')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(
      screen.getByRole('menuitem', { name: 'My coaching' }),
    ).toHaveAttribute('href', '/coaching');
    expect(
      screen.getByRole('menuitem', { name: 'Logout' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Student questions' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Become a coach' }),
    ).toHaveAttribute('href', '/become-coach');
  });

  it('links a coach to student questions only', async () => {
    await open({ nickname: 'ann', role: 'coach' });
    expect(
      screen.getByRole('menuitem', { name: 'Student questions' }),
    ).toHaveAttribute('href', '/admin');
    expect(
      screen.queryByRole('menuitem', { name: 'Coaches' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Become a coach' }),
    ).not.toBeInTheDocument();
  });

  it('links the admin to questions and coach management', async () => {
    await open({ nickname: 'ann', role: 'admin' });
    expect(
      screen.getByRole('menuitem', { name: 'Student questions' }),
    ).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('menuitem', { name: 'Coaches' })).toHaveAttribute(
      'href',
      '/admin/coaches',
    );
  });

  it('logs out', async () => {
    await open({ nickname: 'ann', role: 'user' });
    await userEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });
});
